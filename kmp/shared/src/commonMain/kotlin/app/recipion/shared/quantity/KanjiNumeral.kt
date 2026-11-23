package app.recipion.shared.quantity

private val digitValues = mapOf(
    '〇' to 0, '一' to 1, '二' to 2, '三' to 3, '四' to 4,
    '五' to 5, '六' to 6, '七' to 7, '八' to 8, '九' to 9,
)

private const val INTEGER_SOURCE = "[〇一二三四五六七八九十]+"

// 正規表現に埋め込めるよう、グループは持たない。
const val KANJI_NUMBER_SOURCE =
    "(?:${INTEGER_SOURCE}と${INTEGER_SOURCE}分の${INTEGER_SOURCE}|${INTEGER_SOURCE}分の${INTEGER_SOURCE}|半|${INTEGER_SOURCE})"

private val kanjiNumberPattern = Regex(KANJI_NUMBER_SOURCE)
private val tensPattern = Regex("^([一二三四五六七八九])?十([一二三四五六七八九])?$")
private val digitsPattern = Regex("^[〇一二三四五六七八九]+$")
private val mixedPattern = Regex("^($INTEGER_SOURCE)と($INTEGER_SOURCE)分の($INTEGER_SOURCE)$")
private val fractionPattern = Regex("^($INTEGER_SOURCE)分の($INTEGER_SOURCE)$")

private fun parseKanjiInteger(text: String): Int? {
    tensPattern.matchEntire(text)?.let { match ->
        val (tens, ones) = match.destructured
        val tensValue = if (tens.isEmpty()) 1 else digitValues.getValue(tens[0])
        val onesValue = if (ones.isEmpty()) 0 else digitValues.getValue(ones[0])

        return tensValue * 10 + onesValue
    }

    if (digitsPattern.matches(text) && text.length <= 2) {
        val value = text.map { digitValues.getValue(it) }.joinToString("").toInt()

        return if (value > 0) value else null
    }

    return null
}

fun kanjiNumberToDigits(text: String): String? {
    if (text == "半") {
        return "0.5"
    }

    mixedPattern.matchEntire(text)?.let { match ->
        val (wholeText, denominatorText, numeratorText) = match.destructured
        val whole = parseKanjiInteger(wholeText)
        val denominator = parseKanjiInteger(denominatorText)
        val numerator = parseKanjiInteger(numeratorText)

        return if (whole != null && denominator != null && numerator != null) {
            "${whole}と$numerator/$denominator"
        } else {
            null
        }
    }

    fractionPattern.matchEntire(text)?.let { match ->
        val (denominatorText, numeratorText) = match.destructured
        val denominator = parseKanjiInteger(denominatorText)
        val numerator = parseKanjiInteger(numeratorText)

        return if (denominator != null && numerator != null) "$numerator/$denominator" else null
    }

    return parseKanjiInteger(text)?.toString()
}

fun replaceKanjiNumbers(text: String): String =
    kanjiNumberPattern.replace(text) { found -> kanjiNumberToDigits(found.value) ?: found.value }
