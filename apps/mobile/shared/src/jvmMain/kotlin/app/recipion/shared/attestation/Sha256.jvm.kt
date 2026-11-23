package app.recipion.shared.attestation

import java.security.MessageDigest

internal actual fun sha256Hex(text: String): String =
    MessageDigest.getInstance("SHA-256").digest(text.encodeToByteArray()).toHexString()
