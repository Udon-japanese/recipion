package app.recipion.shared.quantity

// 「1½」を「1 1/2」と読むため、NFKC の前に直す。
private val vulgarFractions = mapOf(
    '½' to " 1/2",
    '⅓' to " 1/3",
    '⅔' to " 2/3",
    '¼' to " 1/4",
    '¾' to " 3/4",
    '⅛' to " 1/8",
)

private val groupedNumber = Regex("""^\d{1,3}(?:,\d{3})+(?:\.\d+)?$""")
private val mixedNumber = Regex("""^(\d+)(?:\s+|と)(\d+)/(\d+)$""")
private val fractionNumber = Regex("""^(\d+)/(\d+)$""")
private val decimalNumber = Regex("""^(?:\d+(?:\.\d+)?|\.\d+)$""")

fun parseQuantityInput(text: String): Double? {
    val replaced = buildString {
        for (character in text) {
            append(vulgarFractions[character] ?: character.toString())
        }
    }
    // NFKC は「½」を「1⁄2」（分数のスラッシュ）にするため、通常のスラッシュに直す。
    val normalized = normalizeNfkc(replaced).replace('⁄', '/').trim()

    if (normalized.isEmpty()) {
        return null
    }

    if (groupedNumber.matches(normalized)) {
        return round6(normalized.replace(",", "").toDouble())
    }

    mixedNumber.matchEntire(normalized)?.let { match ->
        val (whole, numerator, denominator) = match.destructured
        val denominatorValue = denominator.toDouble()

        return if (denominatorValue == 0.0) {
            null
        } else {
            round6(whole.toDouble() + numerator.toDouble() / denominatorValue)
        }
    }

    fractionNumber.matchEntire(normalized)?.let { match ->
        val (numerator, denominator) = match.destructured
        val denominatorValue = denominator.toDouble()

        return if (denominatorValue == 0.0) null else round6(numerator.toDouble() / denominatorValue)
    }

    if (decimalNumber.matches(normalized)) {
        return round6(normalized.toDouble())
    }

    return null
}

internal fun round6(value: Double): Double = toFixedString(value, 6).toDouble()
