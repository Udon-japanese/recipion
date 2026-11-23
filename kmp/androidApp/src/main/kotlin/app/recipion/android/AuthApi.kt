package app.recipion.android

import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import org.json.JSONObject

// Vite は ::1 でだけ待つため、10.0.2.2 ではなく `adb reverse tcp:3000 tcp:3000` でつなぐ。
private const val BASE_URL = "http://localhost:3000"

// 開発サーバーが sec-fetch-mode を足すため、Better Auth が Origin を確かめる。
private const val DEV_ORIGIN = "http://localhost:3000"

private const val DEV_CAPTCHA_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"

private const val CLIENT_HEADER = "x-recipion-client"
private const val CLIENT_VALUE = "android/0.1.0"

class AuthApi(private val client: HttpClient = HttpClient(OkHttp)) {
    /** ログイン用のコードを、メールで送ってもらう。 */
    suspend fun sendCode(email: String) {
        val response = client.post("$BASE_URL/api/auth/email-otp/send-verification-otp") {
            contentType(ContentType.Application.Json)
            header("Origin", DEV_ORIGIN)
            header("x-captcha-response", DEV_CAPTCHA_TOKEN)
            setBody(JSONObject().put("email", email).put("type", "sign-in").toString())
        }

        response.requireSuccess()
    }

    /** コードでログインし、bearer のトークン（応答の set-auth-token）を返す。 */
    suspend fun signIn(email: String, code: String): String {
        val response = client.post("$BASE_URL/api/auth/sign-in/email-otp") {
            contentType(ContentType.Application.Json)
            header("Origin", DEV_ORIGIN)
            setBody(JSONObject().put("email", email).put("otp", code).toString())
        }

        response.requireSuccess()

        return response.headers["set-auth-token"] ?: error("set-auth-token がありません")
    }

    /** トークンで、自分のプロフィール（表示名）を取る。 */
    suspend fun profileName(token: String): String {
        val response = client.get("$BASE_URL/api/v1/me/profile") {
            bearerAuth(token)
            header(CLIENT_HEADER, CLIENT_VALUE)
        }

        response.requireSuccess()

        return JSONObject(response.bodyAsText()).getString("name")
    }
}

private suspend fun HttpResponse.requireSuccess() {
    if (!status.isSuccess()) {
        error("${status.value}: ${bodyAsText()}")
    }
}
