package app.recipion.shared.session

import androidx.room.Room
import app.recipion.shared.api.GET_SESSION_PATH
import app.recipion.shared.api.MemoryTokenStore
import app.recipion.shared.api.Profile
import app.recipion.shared.api.TestApi
import app.recipion.shared.api.respondJson
import app.recipion.shared.api.respondSession
import app.recipion.shared.localdb.LocalDatabase
import app.recipion.shared.localdb.buildLocalDatabase
import app.recipion.shared.shopping.OwnerScope
import app.recipion.shared.shopping.ShoppingItem
import app.recipion.shared.shopping.ShoppingItemStatus
import app.recipion.shared.shopping.ShoppingMemoStore
import app.recipion.shared.shopping.ShoppingSyncer
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun item(id: String) =
    ShoppingItem(id, id, 1.0, null, null, null, null, null, null, null, ShoppingItemStatus.Pending, 0.0, "2026-11-24T00:00:00.000Z", "2026-11-24T00:00:00.000Z")

@OptIn(ExperimentalCoroutinesApi::class)
class SessionViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val database: LocalDatabase = buildLocalDatabase(Room.inMemoryDatabaseBuilder<LocalDatabase>())
    private val store = ShoppingMemoStore(database)

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() {
        Dispatchers.resetMain()
        database.close()
    }

    // ViewModel は Main で、Room は IO で動くので、両方が落ち着くまで回す。
    private suspend fun settle() {
        repeat(20) {
            dispatcher.scheduler.advanceUntilIdle()
            Thread.sleep(10)
        }
    }

    @Test
    fun sessionStates() = runTest(dispatcher) {
        data class Case(val label: String, val tokens: MemoryTokenStore, val status: HttpStatusCode, val expected: SessionState)

        listOf(
            Case("トークンなし", MemoryTokenStore(), HttpStatusCode.OK, SessionState.SignedOut),
            Case("ログイン中", MemoryTokenStore("token", "u1"), HttpStatusCode.OK, SessionState.SignedIn("u1", Profile("れしぴょ", "recipyo"))),
            Case("ID を覚えていない", MemoryTokenStore("token"), HttpStatusCode.OK, SessionState.SignedIn("u1", Profile("れしぴょ", "recipyo"))),
            Case("期限切れ", MemoryTokenStore("token", "u1"), HttpStatusCode.Unauthorized, SessionState.SignedOut),
            // オフライン・サーバーの失敗でも、ログインしたまま、メモを使える。
            Case("名前を読めない", MemoryTokenStore("token", "u1"), HttpStatusCode.InternalServerError, SessionState.SignedIn("u1", null)),
        ).forEach { case ->
            val test = TestApi(tokens = case.tokens, dispatcher = dispatcher) { request ->
                when {
                    request.url.encodedPath == GET_SESSION_PATH -> respondSession("u1")
                    case.status == HttpStatusCode.OK -> respondJson("""{"name":"れしぴょ","handle":"recipyo"}""")
                    else -> respondJson("""{"error":{"code":"X","message":"失敗しました"}}""", case.status)
                }
            }
            val session = SessionViewModel(test.api, ShoppingSyncer(store, test.api.shoppingSync))
            settle()

            assertEquals(case.expected, session.state.value, case.label)
        }
    }

    @Test
    fun signOutAsksBeforeDiscardingUnsentChanges() = runTest(dispatcher) {
        val user = OwnerScope.User("u1")
        val test = TestApi(tokens = MemoryTokenStore("token", "u1"), dispatcher = dispatcher) { request ->
            when (request.url.encodedPath) {
                "/api/v1/me/profile" -> respondJson("""{"name":"れしぴょ","handle":"recipyo"}""")
                "/api/auth/sign-out" -> respondJson("{}")
                // 同期は届かない（オフライン）。
                else -> respondJson("{}", HttpStatusCode.ServiceUnavailable)
            }
        }
        val session = SessionViewModel(test.api, ShoppingSyncer(store, test.api.shoppingSync))
        settle()
        store.put(user, listOf(item("a")))
        store.put(OwnerScope.Guest, listOf(item("g")))

        session.signOut()
        settle()

        assertEquals(1, session.unsentCount.value)
        assertTrue(session.state.value is SessionState.SignedIn)

        session.confirmSignOut()
        settle()

        assertEquals(SessionState.SignedOut, session.state.value)
        assertNull(test.tokens.token)
        assertTrue(store.read(user).items.isEmpty())
        assertEquals(1, store.read(OwnerScope.Guest).items.size)
    }
}
