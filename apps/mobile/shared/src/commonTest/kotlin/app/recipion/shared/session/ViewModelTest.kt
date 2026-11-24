package app.recipion.shared.session

import app.recipion.shared.api.GET_SESSION_PATH
import app.recipion.shared.api.TestApi
import app.recipion.shared.api.bodyText
import app.recipion.shared.api.respondJson
import app.recipion.shared.api.respondSession
import app.recipion.shared.auth.otpResendCooldownSeconds
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class ViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun invalidEmailIsRejectedWithoutRequest() = runTest(dispatcher) {
        val test = TestApi(dispatcher = dispatcher) { respondJson("{}") }
        val login = LoginViewModel(test.api, onSignedIn = {})

        login.updateEmail("user@")
        login.sendCode()
        advanceUntilIdle()

        assertEquals("メールアドレスを確認してください", login.state.value.errorMessage)
        assertTrue(test.requests.isEmpty())
    }

    @Test
    fun fullCodeSignsInAutomatically() = runTest(dispatcher) {
        var signedIn = false
        val test = TestApi(dispatcher = dispatcher) { request ->
            when {
                request.url.encodedPath.endsWith("sign-in/email-otp") -> respondJson("{}", extraHeaders = listOf("set-auth-token" to "token"))
                request.url.encodedPath == GET_SESSION_PATH -> respondSession()
                else -> respondJson("{}")
            }
        }
        val login = LoginViewModel(test.api, onSignedIn = { signedIn = true })

        login.updateEmail(" user@example.com ")
        login.sendCode()
        advanceUntilIdle()

        assertEquals(LoginStep.Code, login.state.value.step)
        assertEquals("user@example.com", login.state.value.email)

        login.updateCode("１２３４５６")
        advanceUntilIdle()

        assertTrue(signedIn)
        assertEquals("""{"email":"user@example.com","otp":"123456"}""", test.requests.first { it.url.encodedPath.endsWith("sign-in/email-otp") }.bodyText())
        assertEquals(LoginUiState(), login.state.value)
    }

    @Test
    fun wrongCodeIsClearedAndExplained() = runTest(dispatcher) {
        val test = TestApi(dispatcher = dispatcher) { respondJson("""{"code":"INVALID_OTP"}""", HttpStatusCode.BadRequest) }
        val login = LoginViewModel(test.api, onSignedIn = {})

        login.updateEmail("user@example.com")
        login.updateCode("000000")
        advanceUntilIdle()

        assertEquals("", login.state.value.code)
        assertEquals("コードが正しくありません。", login.state.value.errorMessage)
    }

    @Test
    fun codeCanBeResentOnlyAfterCooldown() = runTest(dispatcher) {
        val test = TestApi(dispatcher = dispatcher) { respondJson("{}") }
        val login = LoginViewModel(test.api, onSignedIn = {})

        login.updateEmail("user@example.com")
        login.sendCode()
        runCurrent()
        login.resendCode()
        runCurrent()

        assertEquals(1, test.requests.size)
        assertEquals(otpResendCooldownSeconds, login.state.value.resendCooldownSeconds)

        advanceTimeBy(otpResendCooldownSeconds * 1_000L)
        runCurrent()
        login.updateCode("12")
        login.resendCode()
        runCurrent()

        assertEquals(2, test.requests.size)
        assertEquals("", login.state.value.code)
        assertEquals(otpResendCooldownSeconds, login.state.value.resendCooldownSeconds)

        login.backToEmail()

        assertEquals(0, login.state.value.resendCooldownSeconds)
    }
}
