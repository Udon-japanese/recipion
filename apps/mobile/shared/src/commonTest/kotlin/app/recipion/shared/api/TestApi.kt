package app.recipion.shared.api

import app.recipion.shared.attestation.SendCodeAttestation
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockEngineConfig
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.content.TextContent
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.CoroutineDispatcher

class MemoryTokenStore(var token: String? = null, var userId: String? = null) : TokenStore {
    override suspend fun read(): String? = token

    override suspend fun write(token: String) {
        this.token = token
    }

    override suspend fun readUserId(): String? = userId

    override suspend fun writeUserId(userId: String) {
        this.userId = userId
    }

    override suspend fun clear() {
        token = null
        userId = null
    }
}

const val GET_SESSION_PATH = "/api/auth/get-session"

fun MockRequestHandleScope.respondSession(userId: String = "u1"): HttpResponseData =
    respondJson("""{"session":{"id":"s"},"user":{"id":"$userId"}}""")

class TestApi(
    settings: ApiSettings = ApiSettings(baseUrl = "http://localhost", clientVersion = "1.2.3"),
    val tokens: MemoryTokenStore = MemoryTokenStore(),
    dispatcher: CoroutineDispatcher? = null,
    attestation: SendCodeAttestation = SendCodeAttestation { null },
    handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData,
) {
    val requests = mutableListOf<HttpRequestData>()

    val api = RecipionApi(
        engine = MockEngine(
            MockEngineConfig().apply {
                dispatcher?.let { this.dispatcher = it }
                addHandler { request ->
                    requests += request
                    handler(request)
                }
            },
        ),
        settings = settings,
        tokenStore = tokens,
        attestation = attestation,
    )
}

fun MockRequestHandleScope.respondJson(
    body: String,
    status: HttpStatusCode = HttpStatusCode.OK,
    extraHeaders: List<Pair<String, String>> = emptyList(),
): HttpResponseData = respond(
    content = body,
    status = status,
    headers = headersOf(*(extraHeaders + (HttpHeaders.ContentType to "application/json")).map { (name, value) -> name to listOf(value) }.toTypedArray()),
)

fun HttpRequestData.bodyText(): String? = (body as? TextContent)?.text
