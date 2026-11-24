package app.recipion.shared.shopping

import androidx.room.Room
import app.recipion.shared.localdb.LocalDatabase
import app.recipion.shared.localdb.buildLocalDatabase
import kotlinx.coroutines.test.runTest
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val user = OwnerScope.User("u1")
private const val T = "2026-11-24T00:00:00.000Z"

private fun item(id: String, name: String = id, sortOrder: Double = 0.0, status: ShoppingItemStatus = ShoppingItemStatus.Pending) =
    ShoppingItem(id, name, 1.0, null, null, null, null, null, null, null, status, sortOrder, T, T)

private fun ShoppingRecordData.versioned(version: Long) =
    VersionedShoppingRecord(kind, recordId, false, encodeShoppingRecordData(this), version)

// サーバーの代わり。送られた行を記録し、決めておいた結果を返す。
private class FakeRemote : ShoppingSyncRemote {
    val pushed = mutableListOf<List<ShoppingPushRecord>>()
    var pages: MutableList<ShoppingSyncPage> = mutableListOf()
    var results: (List<ShoppingPushRecord>) -> List<ShoppingPushResult> = { records ->
        records.mapIndexed { index, _ -> ShoppingPushResult.Applied(version = 100L + index) }
    }
    var failPush = false
    var onPush: suspend () -> Unit = {}

    override suspend fun push(ownerScope: OwnerScope.User, records: List<ShoppingPushRecord>): List<ShoppingPushResult> {
        pushed += records
        onPush()
        if (failPush) error("返事が届かない")

        return results(records)
    }

    override suspend fun pull(ownerScope: OwnerScope.User, after: Long): ShoppingSyncPage =
        pages.removeFirstOrNull() ?: ShoppingSyncPage(emptyList(), after, hasMore = false)
}

class ShoppingMemoStoreTest {
    private var changeCount = 0
    private val database: LocalDatabase = buildLocalDatabase(Room.inMemoryDatabaseBuilder<LocalDatabase>())
    private val store = ShoppingMemoStore(database, createChangeId = { "change-${++changeCount}" })
    private val remote = FakeRemote()

    @AfterTest
    fun close() = database.close()

    private suspend fun sync() = syncShoppingMemo(user, store, remote)

    @Test
    fun onlySignedInWritesAreQueued() = runTest {
        store.put(OwnerScope.Guest, listOf(item("g")))
        store.put(user, listOf(item("u")))

        assertEquals(1, store.countPending(user))
        assertEquals(listOf("g"), store.read(OwnerScope.Guest).items.map { it.id })
        assertEquals(listOf("u"), store.read(user).items.map { it.id })
    }

    @Test
    fun firstSyncMergesDeviceMemoIntoServerMemo() = runTest {
        store.put(user, listOf(item("local", sortOrder = 0.0), item("both", name = "端末の方")))
        remote.pages = mutableListOf(
            ShoppingSyncPage(listOf(item("server", sortOrder = 4.0).versioned(7), item("both", name = "サーバーの方").versioned(8)), 8, false),
        )

        val result = sync()

        assertEquals(1, result.pushedCount)
        assertEquals(listOf("local"), remote.pushed.single().map { it.id })
        assertEquals(0, remote.pushed.single().single().baseVersion)
        val items = store.read(user).items.associateBy { it.id }
        assertEquals("サーバーの方", items.getValue("both").name)
        assertEquals(5.0, items.getValue("local").sortOrder)
        assertEquals(0, store.countPending(user))
        assertEquals(8, store.readCursor(user))
    }

    @Test
    fun unsentRowsAreNotOverwrittenByPull() = runTest {
        remote.pages = mutableListOf(ShoppingSyncPage(listOf(item("a", name = "前").versioned(1)), 1, false))
        sync()

        store.put(user, listOf(item("a", name = "端末で変えた")))
        remote.failPush = true
        assertFailsWith<IllegalStateException> { sync() }

        remote.failPush = false
        remote.results = { records -> records.map { ShoppingPushResult.Applied(5) } }
        remote.pages = mutableListOf()
        sync()

        // 返事を受け取れなかった変更を、次に送るときに伝える（サーバーが二重に当てない）。
        val resent = remote.pushed.last().single()
        assertEquals(listOf("change-1"), resent.unackedChangeIds)
        assertEquals(1, resent.baseVersion)
        assertEquals("端末で変えた", store.read(user).items.single().name)
    }

    @Test
    fun pulledRowWaitsWhileLocalChangeIsPending() = runTest {
        remote.pages = mutableListOf(ShoppingSyncPage(listOf(item("a").versioned(1)), 1, false))
        sync()
        store.put(user, listOf(item("a", name = "端末")))

        store.applyPulled(user, listOf(item("a", name = "ほかの端末").versioned(2)), 2)

        assertEquals("端末", store.read(user).items.single().name)
        assertEquals(1, store.countPending(user))
    }

    @Test
    fun conflictKeepsServerRow() = runTest {
        remote.pages = mutableListOf(ShoppingSyncPage(listOf(item("a").versioned(1)), 1, false))
        sync()
        store.put(user, listOf(item("a", name = "端末")))
        remote.results = { listOf(ShoppingPushResult.Conflict(item("a", name = "先に届いた").versioned(3))) }

        sync()

        assertEquals("先に届いた", store.read(user).items.single().name)
        assertEquals(0, store.countPending(user))
    }

    @Test
    fun changeWrittenWhileSendingStaysQueued() = runTest {
        remote.pages = mutableListOf(ShoppingSyncPage(emptyList(), 0, false))
        store.put(user, listOf(item("a", name = "1回目")))
        sync()
        store.put(user, listOf(item("a", name = "2回目")))
        remote.onPush = { store.put(user, listOf(item("a", name = "送っている間に"))) }

        sync()

        assertEquals(1, store.countPending(user))
        assertEquals("送っている間に", store.read(user).items.single().name)
    }

    @Test
    fun deletedRowIsSentAsDeleted() = runTest {
        remote.pages = mutableListOf(ShoppingSyncPage(listOf(item("a").versioned(1)), 1, false))
        sync()
        store.delete(user, ShoppingRecordKind.Item, "a")

        sync()

        val sent = remote.pushed.last().single()
        assertTrue(sent.deleted)
        assertNull(sent.data)
        assertEquals(1, sent.baseVersion)
    }

    @Test
    fun guestMemoMovesToAccount() = runTest {
        store.put(OwnerScope.Guest, listOf(item("g1"), item("bought", status = ShoppingItemStatus.Purchased)))
        store.put(user, listOf(item("u1", sortOrder = 2.0)))

        val adoption = store.adoptGuest(user)

        assertEquals(setOf("g1", "bought"), adoption.data.items.map { it.id }.toSet())
        assertTrue(store.read(OwnerScope.Guest).items.isEmpty())
        assertEquals(setOf("u1", "g1", "bought"), store.read(user).items.map { it.id }.toSet())
        assertEquals(3, store.countPending(user))
    }

    @Test
    fun clearRemovesOnlyThatAccount() = runTest {
        store.put(OwnerScope.Guest, listOf(item("g")))
        store.put(user, listOf(item("u")))
        store.put(OwnerScope.User("u2"), listOf(item("other")))

        store.clear(user)

        assertTrue(store.read(user).items.isEmpty())
        assertEquals(0, store.countPending(user))
        assertNull(store.readCursor(user))
        assertEquals(1, store.read(OwnerScope.Guest).items.size)
        assertEquals(1, store.read(OwnerScope.User("u2")).items.size)
    }

    @Test
    fun malformedPulledRowIsRejected() = runTest {
        val bad = item("a").versioned(1).copy(id = "別の ID")
        remote.pages = mutableListOf(ShoppingSyncPage(listOf(bad), 1, false))

        assertFailsWith<IllegalArgumentException> { sync() }
        assertNull(store.readCursor(user))
    }
}
