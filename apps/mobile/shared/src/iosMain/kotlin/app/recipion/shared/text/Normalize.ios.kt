package app.recipion.shared.text

import kotlinx.cinterop.BetaInteropApi
import platform.Foundation.NSString
import platform.Foundation.create
import platform.Foundation.precomposedStringWithCompatibilityMapping

@OptIn(BetaInteropApi::class)
internal actual fun normalizeNfkc(text: String): String =
    NSString.create(string = text).precomposedStringWithCompatibilityMapping
