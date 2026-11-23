package app.recipion.shared.quantity

import kotlin.math.abs
import kotlin.math.floor

private val fractionDenominators = listOf(2, 3, 4, 8)

// 1/3 は、0.333333 で保存されるため、近い分数に戻す（許す誤差）。
private const val TOLERANCE = 0.0001

// JS の Math.round と同じ（Kotlin の round は偶数へ丸め、floor(x + 0.5) は 0.49999999999999994 で 1 になる）。
internal fun jsRound(value: Double): Double {
    if (!value.isFinite()) {
        return value
    }

    if ((value < 0 && value >= -0.5) || (value == 0.0 && 1.0 / value < 0)) {
        return -0.0
    }

    val lower = floor(value)

    return if (value - lower >= 0.5) lower + 1 else lower
}

internal fun formatDecimal(value: Double, maximumFractionDigits: Int, grouping: Boolean): String {
    if (value.isNaN()) {
        return "NaN"
    }

    if (value.isInfinite()) {
        return if (value > 0) "∞" else "-∞"
    }

    val fixed = toFixedString(value, maximumFractionDigits)
    // Intl は、-0 も「-0」と書く（toFixed は「0」）。符号は、値の符号のビットで決める。
    val negative = value < 0 || (value == 0.0 && 1.0 / value < 0)
    val unsigned = fixed.removePrefix("-")
    val integerPart = unsigned.substringBefore('.')
    val fractionPart = unsigned.substringAfter('.', "").trimEnd('0')
    val groupedInteger = if (grouping) {
        integerPart.reversed().chunked(3).joinToString(",").reversed()
    } else {
        integerPart
    }
    val sign = if (negative) "-" else ""

    return if (fractionPart.isEmpty()) "$sign$groupedInteger" else "$sign$groupedInteger.$fractionPart"
}

fun formatQuantity(value: Double, allowFractions: Boolean = true, grouping: Boolean = true): String {
    fun decimal(number: Double) = formatDecimal(number, maximumFractionDigits = 6, grouping = grouping)

    if (!allowFractions || !value.isFinite()) {
        return decimal(value)
    }

    val whole = floor(value + TOLERANCE)
    val fractionPart = value - whole

    if (abs(fractionPart) < TOLERANCE) {
        return decimal(whole)
    }

    for (denominator in fractionDenominators) {
        val numerator = jsRound(fractionPart * denominator).toInt()

        if (numerator in 1 until denominator && abs(fractionPart - numerator.toDouble() / denominator) < TOLERANCE) {
            return if (whole > 0) "${decimal(whole)} $numerator/$denominator" else "$numerator/$denominator"
        }
    }

    return decimal(value)
}

// 分数にしない（1/2kg ではなく 0.5kg）。
private val decimalUnits = setOf("g", "kg", "ml", "l", "cc")

fun formatQuantityForUnit(value: Double, unitLabel: String?): String =
    formatQuantity(value, allowFractions = unitLabel == null || unitLabel.lowercase() !in decimalUnits)

data class AmountDisplay(val texts: List<String>, val unitLabel: String?)

fun formatAmounts(
    quantities: List<Double>,
    unitLabel: String?,
    formatQuantityText: (Double) -> String,
    grouping: Boolean = true,
): AmountDisplay {
    val largerUnit = largerMeasureUnit(unitLabel)
    val canSwitch = largerUnit != null &&
        quantities.isNotEmpty() &&
        quantities.all { it.isFinite() && abs(it) >= LARGER_MEASURE_FACTOR }

    if (!canSwitch) {
        return AmountDisplay(quantities.map(formatQuantityText), unitLabel)
    }

    // 元の単位の書き方（小数6桁まで）を 1000 で割っても、桁を失わないよう、9桁まで。
    return AmountDisplay(
        quantities.map { formatDecimal(it / LARGER_MEASURE_FACTOR, maximumFractionDigits = 9, grouping = grouping) },
        largerUnit,
    )
}

fun formatAmountForUnit(value: Double, unitLabel: String?): String {
    val display = formatAmounts(listOf(value), unitLabel, { formatQuantityForUnit(it, unitLabel) })

    return display.texts.joinToString("") + (display.unitLabel ?: "")
}

enum class StockUnitCode { Count, G, Ml }

private fun roundMeasuredStockAmount(value: Double): Double =
    if (value >= 10) jsRound(value) else jsRound(value * 10) / 10

fun formatStockAmount(value: Double, stockUnitCode: StockUnitCode): String {
    if (stockUnitCode == StockUnitCode.Count) {
        val text = formatQuantity(value)

        return if ('.' in text) formatQuantity(jsRound(value * 10) / 10, allowFractions = false) else text
    }

    return formatQuantity(roundMeasuredStockAmount(value), allowFractions = false)
}

fun formatStockAmountWithUnit(value: Double, stockUnitCode: StockUnitCode, stockUnitLabel: String): String {
    if (stockUnitCode == StockUnitCode.Count) {
        return formatStockAmount(value, stockUnitCode) + stockUnitLabel
    }

    val display = formatAmounts(
        listOf(roundMeasuredStockAmount(value)),
        stockUnitLabel,
        { formatQuantity(it, allowFractions = false) },
    )

    return display.texts.joinToString("") + (display.unitLabel ?: stockUnitLabel)
}
