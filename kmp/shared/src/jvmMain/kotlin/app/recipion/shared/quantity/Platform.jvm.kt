package app.recipion.shared.quantity

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.Normalizer

internal actual fun normalizeNfkc(text: String): String =
    Normalizer.normalize(text, Normalizer.Form.NFKC)

internal actual fun toFixedString(value: Double, digits: Int): String {
    val text = BigDecimal(value).setScale(digits, RoundingMode.HALF_UP).toPlainString()

    // toFixed は、負の数が丸めで 0 になっても「-0.00」と書く（BigDecimal は符号を失う）。
    return if (value < 0 && !text.startsWith("-")) "-$text" else text
}
