@file:OptIn(ExperimentalJsExport::class)

package app.recipion.shared.quantity

@JsExport
fun parseQuantity(text: String): Double? = parseQuantityInput(text)

@JsExport
fun replaceKanjiNumerals(text: String): String = replaceKanjiNumbers(text)

@JsExport
fun formatQuantityText(value: Double, allowFractions: Boolean, grouping: Boolean): String =
    formatQuantity(value, allowFractions, grouping)

@JsExport
fun formatAmountWithUnit(value: Double, unitLabel: String?): String = formatAmountForUnit(value, unitLabel)

@JsExport
fun formatStockAmountText(value: Double, stockUnitCode: String, stockUnitLabel: String): String =
    formatStockAmountWithUnit(value, stockUnitCodeOf(stockUnitCode), stockUnitLabel)

private fun stockUnitCodeOf(code: String): StockUnitCode = when (code) {
    "count" -> StockUnitCode.Count
    "g" -> StockUnitCode.G
    "ml" -> StockUnitCode.Ml
    else -> throw IllegalArgumentException("在庫の単位が正しくありません: $code")
}

@JsExport
class AmountDisplayJs(val texts: Array<String>, val unitLabel: String?)

@JsExport
fun formatAmountsText(
    quantities: Array<Double>,
    unitLabel: String?,
    formatQuantityText: (Double) -> String,
    grouping: Boolean,
): AmountDisplayJs {
    val display = formatAmounts(quantities.toList(), unitLabel, formatQuantityText, grouping)

    return AmountDisplayJs(display.texts.toTypedArray(), display.unitLabel)
}

@JsExport
fun formatAmountsRaw(quantities: Array<Double>, unitLabel: String?): AmountDisplayExport {
    val display = formatAmounts(quantities.toList(), unitLabel, { formatQuantity(it) })

    return AmountDisplayExport(display.texts, display.unitLabel)
}

@JsExport
data class AmountDisplayExport(val texts: List<String>, val unitLabel: String?)

@JsExport
fun kanjiNumberToDigitsText(text: String): String? = kanjiNumberToDigits(text)

@JsExport
val kanjiNumberSource: String = KANJI_NUMBER_SOURCE

@JsExport
fun formatQuantityForUnitText(value: Double, unitLabel: String?): String = formatQuantityForUnit(value, unitLabel)

@JsExport
fun formatStockAmountPlain(value: Double, stockUnitCode: String): String =
    formatStockAmount(value, stockUnitCodeOf(stockUnitCode))
