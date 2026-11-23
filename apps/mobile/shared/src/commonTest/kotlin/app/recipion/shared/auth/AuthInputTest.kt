package app.recipion.shared.auth

import app.recipion.shared.config.EMAIL_ADDRESS_CASES_JSON
import app.recipion.shared.config.OTP_DIGITS_CASES_JSON
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals

@Serializable
private data class TextCase(val input: String, val expected: String?)

private fun cases(json: String): List<TextCase> = Json.decodeFromString(json)

class AuthInputTest {
    @Test
    fun parseEmailAddressMatchesWeb() {
        for (case in cases(EMAIL_ADDRESS_CASES_JSON)) {
            assertEquals(case.expected, parseEmailAddress(case.input), case.input)
        }
    }

    @Test
    fun otpDigitsFromInputMatchesWeb() {
        for (case in cases(OTP_DIGITS_CASES_JSON)) {
            assertEquals(case.expected, otpDigitsFromInput(case.input), case.input)
        }
    }

    @Test
    fun authErrorMessage() {
        val rateLimited = authErrorMessage("AUTH_RATE_LIMITED", null)

        listOf(
            Triple("INVALID_OTP", null, "コードが正しくありません。"),
            Triple(null, 429, rateLimited),
            Triple("SOMETHING_ELSE", 500, "ログインの処理に失敗しました。時間をおいてもう一度お試しください。"),
            Triple(null, null, "ログインの処理に失敗しました。時間をおいてもう一度お試しください。"),
        ).forEach { (code, status, expected) ->
            assertEquals(expected, authErrorMessage(code, status), "$code $status")
        }
    }
}
