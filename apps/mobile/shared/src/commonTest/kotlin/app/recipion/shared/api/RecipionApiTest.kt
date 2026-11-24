package app.recipion.shared.api

import app.recipion.shared.attestation.SendCodeAttestation
import app.recipion.shared.attestation.sendCodeRequestHash
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RecipionApiTest {
    @Test
    fun signInStoresTokenAndProfileSendsIt() = runTest {
        val test = TestApi { request ->
            when (request.url.encodedPath) {
                "/api/auth/sign-in/email-otp" -> respondJson("{}", extraHeaders = listOf("set-auth-token" to "token-1"))
                GET_SESSION_PATH -> respondSession("u1")
                else -> respondJson("""{"name":"れしぴょ","handle":"recipyo"}""")
            }
        }

        test.api.signIn("user@example.com", "123456")
        val profile = test.api.profile()

        assertEquals(Profile(name = "れしぴょ", handle = "recipyo"), profile)
        assertEquals("token-1", test.tokens.token)
        assertEquals("u1", test.tokens.userId)
        assertEquals("Bearer token-1", test.requests.last().headers[HttpHeaders.Authorization])
        assertEquals("android/1.2.3", test.requests.last().headers["x-recipion-client"])
    }

    @Test
    fun refreshedTokenReplacesStoredOne() = runTest {
        val test = TestApi(tokens = MemoryTokenStore("old")) {
            respondJson("""{"name":"a","handle":"b"}""", extraHeaders = listOf("set-auth-token" to "new"))
        }

        test.api.profile()

        assertEquals("new", test.tokens.token)
    }

    @Test
    fun unauthorizedApiClearsToken() = runTest {
        val test = TestApi(tokens = MemoryTokenStore("expired")) {
            respondJson("""{"error":{"code":"AUTH_REQUIRED","message":"ログインしてください"}}""", HttpStatusCode.Unauthorized)
        }

        val error = assertFailsWith<ApiException> { test.api.profile() }

        assertEquals("AUTH_REQUIRED", error.code)
        assertEquals("ログインしてください", error.message)
        assertNull(test.tokens.token)
    }

    @Test
    fun upgradeRequiredIsReported() = runTest {
        val test = TestApi {
            respondJson(
                """{"error":{"code":"CLIENT_UPDATE_REQUIRED","message":"アプリが新しくなりました"}}""",
                HttpStatusCode.UpgradeRequired,
            )
        }

        val error = assertFailsWith<ApiException> { test.api.sendCode("user@example.com") }

        assertEquals("アプリが新しくなりました", error.message)
        assertTrue(test.api.updateRequired.value)
    }

    @Test
    fun authErrorsBecomeJapaneseMessages() = runTest {
        val test = TestApi(tokens = MemoryTokenStore("kept")) {
            respondJson("""{"code":"INVALID_OTP","message":"Invalid OTP"}""", HttpStatusCode.BadRequest)
        }

        val error = assertFailsWith<ApiException> { test.api.signIn("user@example.com", "000000") }

        assertEquals("コードが正しくありません。", error.message)
        assertEquals("kept", test.tokens.token)
    }

    @Test
    fun devOriginIsSentOnlyWhenConfigured() = runTest {
        val dev = TestApi(
            settings = ApiSettings(baseUrl = "http://localhost", clientVersion = "1.0.0", devOrigin = "http://localhost:3000"),
        ) { respondJson("{}") }
        val release = TestApi { respondJson("{}") }

        dev.api.sendCode("user@example.com")
        release.api.sendCode("user@example.com")

        assertEquals("http://localhost:3000", dev.requests.single().headers["Origin"])
        assertNull(release.requests.single().headers["Origin"])
    }

    @Test
    fun sendCodeAttachesAttestationForThatEmail() = runTest {
        val hashes = mutableListOf<String>()
        val test = TestApi(attestation = { hash -> hashes += hash; "integrity-token" }) { respondJson("{}") }

        test.api.sendCode("user@example.com")

        assertEquals(listOf(sendCodeRequestHash("user@example.com")), hashes)
        assertEquals("integrity-token", test.requests.single().headers["x-recipion-integrity"])
    }

    @Test
    fun sendCodeStillSendsWithoutAttestation() = runTest {
        listOf<SendCodeAttestation>(
            SendCodeAttestation { null },
            SendCodeAttestation { throw IllegalStateException("Play Store がない") },
        ).forEach { attestation ->
            val test = TestApi(attestation = attestation) { respondJson("{}") }

            test.api.sendCode("user@example.com")

            assertNull(test.requests.single().headers["x-recipion-integrity"])
        }
    }

    @Test
    fun signOutClearsTokenEvenWhenRequestFails() = runTest {
        val test = TestApi(tokens = MemoryTokenStore("token")) { respondJson("{}", HttpStatusCode.InternalServerError) }

        assertFailsWith<ApiException> { test.api.signOut() }

        assertNull(test.tokens.token)
    }

    @Test
    fun missingSessionSignsOut() = runTest {
        val test = TestApi(tokens = MemoryTokenStore("expired")) { respondJson("null") }

        assertFailsWith<ApiException> { test.api.fetchUserId() }

        assertNull(test.tokens.token)
    }
}
