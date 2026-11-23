package app.recipion.shared.api

import app.recipion.shared.auth.authErrorMessage
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
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
    val devCaptchaToken: String? = null,
)

interface TokenStore {
    suspend fun read(): String?

    suspend fun write(token: String)

    suspend fun clear()
}

class ApiException(val code: String?, val status: Int, message: String) : Exception(message)

@Serializable
data class Profile(val name: String, val handle: String)

@Serializable
private data class SendCodeRequest(val email: String, val type: String)

@Serializable
private data class SignInRequest(val email: String, val otp: String)

private const val CLIENT_HEADER = "x-recipion-client"
private const val CAPTCHA_HEADER = "x-captcha-response"
private const val SET_AUTH_TOKEN_HEADER = "set-auth-token"
private const val AUTH_PATH_PREFIX = "/api/auth/"

class RecipionApi(
    engine: HttpClientEngine,
    private val settings: ApiSettings,
    private val tokenStore: TokenStore,
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
        send(AUTH_PATH_PREFIX + "email-otp/send-verification-otp") { path ->
            client.post(path) {
                jsonBody(SendCodeRequest(email = email, type = "sign-in"))
                settings.devCaptchaToken?.let { header(CAPTCHA_HEADER, it) }
            }
        }
    }

    suspend fun signIn(email: String, otp: String) {
        val response = send(AUTH_PATH_PREFIX + "sign-in/email-otp") { path ->
            client.post(path) { jsonBody(SignInRequest(email = email, otp = otp)) }
        }

        if (response.headers[SET_AUTH_TOKEN_HEADER] == null) {
            throw ApiException(code = null, status = response.status.value, message = authErrorMessage(null, null))
        }
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
