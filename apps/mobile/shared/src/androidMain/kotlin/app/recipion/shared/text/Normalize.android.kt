package app.recipion.shared.text

import java.text.Normalizer

internal actual fun normalizeNfkc(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFKC)
