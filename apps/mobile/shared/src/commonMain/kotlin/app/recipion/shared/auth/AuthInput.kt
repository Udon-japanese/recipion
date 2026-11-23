package app.recipion.shared.auth

import app.recipion.shared.config.authData
import app.recipion.shared.text.normalizeNfkc

val otpLength: Int get() = authData.otpLength

val otpExpiresInMinutes: Int get() = authData.otpExpiresInSeconds / 60

internal val otpResendCooldownSeconds: Int get() = authData.otpResendCooldownSeconds

// Valibot の email() と同じ形（\w を書き下している）。
private val emailPattern =
    Regex("""^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*@[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*\.[A-Za-z]{2,}$""")

fun parseEmailAddress(text: String): String? {
    val trimmed = text.trim()

    return if (emailPattern.matches(trimmed)) trimmed else null
}

fun otpDigitsFromInput(raw: String): String =
    normalizeNfkc(raw).filter { it in '0'..'9' }.take(otpLength)

fun authErrorMessage(code: String?, status: Int?): String =
    code?.let { authData.errorMessagesByCode[it] }
        ?: if (status == 429) authData.errorMessagesByCode.getValue(authData.rateLimitedCode)
        else authData.fallbackErrorMessage
