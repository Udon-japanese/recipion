package app.recipion.shared.attestation

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.usePinned
import platform.CoreCrypto.CC_SHA256
import platform.CoreCrypto.CC_SHA256_DIGEST_LENGTH

@OptIn(ExperimentalForeignApi::class)
internal actual fun sha256Hex(text: String): String {
    // 空の配列は addressOf(0) で落ちるため、末尾に 0 を足して長さは元のまま渡す。
    val input = text.encodeToByteArray() + 0
    val digest = UByteArray(CC_SHA256_DIGEST_LENGTH)

    input.usePinned { source ->
        digest.usePinned { target ->
            CC_SHA256(source.addressOf(0), (input.size - 1).convert(), target.addressOf(0))
        }
    }

    return digest.toHexString()
}
