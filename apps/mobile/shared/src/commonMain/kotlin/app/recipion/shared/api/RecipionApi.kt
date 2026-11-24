package app.recipion.shared.api

import app.recipion.shared.attestation.SendCodeAttestation
import app.recipion.shared.attestation.sendCodeRequestHash
import app.recipion.shared.auth.authErrorMessage
import app.recipion.shared.shopping.OwnerScope
import app.recipion.shared.shopping.ShoppingPushRecord
import app.recipion.shared.shopping.ShoppingPushResult
import app.recipion.shared.shopping.ShoppingSyncPage
import app.recipion.shared.shopping.ShoppingSyncRemote
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

data class ApiSettings(
    val baseUrl: String,
    val clientVersion: String,
    // 開発サーバーは sec-fetch-mode を足すため、Better Auth が Origin を確かめる。
    val devOrigin: String? = null,
)

interface TokenStore {
    suspend fun read(): String?

    suspend fun write(token: String)

    // ログインしている人の ID（端末のメモの持ち主。オフラインで起動しても分かるように、トークンと一緒に覚える）。
    suspend fun readUserId(): String?

    suspend fun writeUserId(userId: String)

    // トークンと ID の両方を消す。
    suspend fun clear()
}

class ApiException(val code: String?, val status: Int, message: String) : Exception(message)

@Serializable
data class Profile(val name: String, val handle: String)

@Serializable
private data class SendCodeRequest(val email: String, val type: String)

@Serializable
private data class SignInRequest(val email: String, val otp: String)

@Serializable
private data class SessionUser(val id: String)

@Serializable
private data class SessionResponse(val user: SessionUser)

@Serializable
private data class ShoppingPushRequest(val expectedUserId: String, val records: List<ShoppingPushRecord>)

@Serializable
private data class ShoppingPushResponse(val results: List<ShoppingPushResult>)

private const val CLIENT_HEADER = "x-recipion-client"
private const val INTEGRITY_HEADER = "x-recipion-integrity"
private const val SET_AUTH_TOKEN_HEADER = "set-auth-token"
private const val AUTH_PATH_PREFIX = "/api/auth/"
private const val SHOPPING_SYNC_PATH = "/api/v1/shopping/sync/"

class RecipionApi(
    engine: HttpClientEngine,
    private val settings: ApiSettings,
    private val tokenStore: TokenStore,
    private val attestation: SendCodeAttestation = SendCodeAttestation { null },
) {
    private val json = Json { ignoreUnknownKeys = true }

    private val client = HttpClient(engine) {
        expectSuccess = false
        install(ContentNegotiation) { json(json) }
        defaultRequest {
            url(settings.baseUrl)
            header(CLIENT_HEADER, "android/${settings.clientVersion}")
            settings.devOrigin?.let { header("Origin", it) }
        }
    }

    private val updateRequiredState = MutableStateFlow(false)

    val updateRequired: StateFlow<Boolean> = updateRequiredState.asStateFlow()

    suspend fun hasSession(): Boolean = tokenStore.read() != null

    suspend fun sendCode(email: String) {
        val integrity = attestationToken(email)

        send(AUTH_PATH_PREFIX + "email-otp/send-verification-otp") { path ->
            client.post(path) {
                jsonBody(SendCodeRequest(email = email, type = "sign-in"))
                integrity?.let { header(INTEGRITY_HEADER, it) }
            }
        }
    }

    // 証明が取れなくても、送信は止めない（サーバーが証明なしの枠で受ける）。
    private suspend fun attestationToken(email: String): String? =
        try {
            attestation.token(sendCodeRequestHash(email))
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            null
        }

    suspend fun signIn(email: String, otp: String) {
        val response = send(AUTH_PATH_PREFIX + "sign-in/email-otp") { path ->
            client.post(path) { jsonBody(SignInRequest(email = email, otp = otp)) }
        }

        if (response.headers[SET_AUTH_TOKEN_HEADER] == null) {
            throw ApiException(code = null, status = response.status.value, message = authErrorMessage(null, null))
        }

        fetchUserId()
    }

    suspend fun userId(): String? = tokenStore.readUserId()

    // トークンだけがあって ID を覚えていない（ID を覚える前の版でログインした）ときに、取り直す。
    suspend fun fetchUserId(): String {
        val body = send(AUTH_PATH_PREFIX + "get-session") { path -> client.get(path) { withToken() } }.bodyAsText()
        val session = runCatching { json.decodeFromString<SessionResponse>(body) }.getOrNull()

        if (session == null) {
            tokenStore.clear()
            throw ApiException(code = null, status = 401, message = authErrorMessage(null, null))
        }

        tokenStore.writeUserId(session.user.id)

        return session.user.id
    }

    val shoppingSync: ShoppingSyncRemote = object : ShoppingSyncRemote {
        override suspend fun push(ownerScope: OwnerScope.User, records: List<ShoppingPushRecord>): List<ShoppingPushResult> =
            json.decodeFromString<ShoppingPushResponse>(
                send(SHOPPING_SYNC_PATH + "push") { path ->
                    client.post(path) {
                        withToken()
                        jsonBody(ShoppingPushRequest(expectedUserId = ownerScope.userId, records = records))
                    }
                }.bodyAsText(),
            ).results

        override suspend fun pull(ownerScope: OwnerScope.User, after: Long): ShoppingSyncPage =
            json.decodeFromString(
                send(SHOPPING_SYNC_PATH + "pull") { path ->
                    client.get(path) {
                        withToken()
                        parameter("expectedUserId", ownerScope.userId)
                        parameter("after", after)
                    }
                }.bodyAsText(),
            )
    }

    suspend fun signOut() {
        try {
            send(AUTH_PATH_PREFIX + "sign-out") { path -> client.post(path) { withToken() } }
        } finally {
            tokenStore.clear()
        }
    }

    suspend fun profile(): Profile =
        json.decodeFromString(
            send("/api/v1/me/profile") { path -> client.get(path) { withToken() } }.bodyAsText(),
        )

    private suspend fun HttpRequestBuilder.withToken() {
        tokenStore.read()?.let { bearerAuth(it) }
    }

    private inline fun <reified T> HttpRequestBuilder.jsonBody(body: T) {
        contentType(ContentType.Application.Json)
        setBody(body)
    }

    private suspend fun send(path: String, request: suspend (String) -> HttpResponse): HttpResponse {
        val response = request(path)

        response.headers[SET_AUTH_TOKEN_HEADER]?.let { tokenStore.write(it) }

        if (response.status.isSuccess()) {
            return response
        }

        if (response.status == HttpStatusCode.UpgradeRequired) {
            updateRequiredState.value = true
        }

        if (response.status == HttpStatusCode.Unauthorized && !path.startsWith(AUTH_PATH_PREFIX)) {
            tokenStore.clear()
        }

        throw toApiException(path, response.status.value, response.bodyAsText())
    }

    // API（/api/v1 と版の確認）は { error: { code, message } }、Better Auth は { code, message } を返す。
    private fun toApiException(path: String, status: Int, body: String): ApiException {
        val root = runCatching { json.parseToJsonElement(body).jsonObject }.getOrNull()
        val apiError = root?.get("error") as? JsonObject

        if (apiError != null) {
            return ApiException(
                code = apiError.string("code"),
                status = status,
                message = apiError.string("message") ?: UNEXPECTED_RESPONSE_MESSAGE,
            )
        }

        val code = root?.string("code")
        val message = if (path.startsWith(AUTH_PATH_PREFIX)) authErrorMessage(code, status) else UNEXPECTED_RESPONSE_MESSAGE

        return ApiException(code = code, status = status, message = message)
    }

    private fun JsonObject.string(key: String): String? = (get(key) as? JsonPrimitive)?.takeIf { it.isString }?.content
}
