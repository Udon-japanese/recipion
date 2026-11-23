package app.recipion.shared.config

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
internal data class AuthData(
    val otpLength: Int,
    val otpExpiresInSeconds: Int,
    val otpResendCooldownSeconds: Int,
    val rateLimitedCode: String,
    val errorMessagesByCode: Map<String, String>,
    val fallbackErrorMessage: String,
)

internal val authData: AuthData = Json.decodeFromString(AUTH_JSON)
