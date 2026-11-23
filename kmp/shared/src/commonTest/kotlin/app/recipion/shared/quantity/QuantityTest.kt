package app.recipion.shared.quantity

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class QuantityTest {
    @Test
    fun parseQuantityInput_reads() {
        val cases = listOf(
            "1/2" to 0.5, "1と1/2" to 1.5, "1 1/2" to 1.5, "１／４" to 0.25, "½" to 0.5, "1½" to 1.5,
            "２¾" to 2.75, "0.5" to 0.5, ".5" to 0.5, "3" to 3.0, "  2  " to 2.0, "1/3" to 0.333333,
            "1,000" to 1000.0, "1,250.5" to 1250.5,
        )

        for ((input, expected) in cases) {
            assertEquals(expected, parseQuantityInput(input), "「$input」")
        }
    }

    @Test
    fun parseQuantityInput_rejects() {
        for (input in listOf("", "  ", "abc", "1/0", "-1", "1/2/3", "1..5")) {
            assertNull(parseQuantityInput(input), "「$input」")
        }
    }

    @Test
    fun formatQuantity_formats() {
        val cases = listOf(
            0.5 to "1/2", 1.5 to "1 1/2", 0.25 to "1/4", 0.75 to "3/4", 0.333333 to "1/3",
            2.666667 to "2 2/3", 0.125 to "1/8", 3.0 to "3", 0.0 to "0", 0.2 to "0.2", 1250.0 to "1,250",
        )

        for ((value, expected) in cases) {
            assertEquals(expected, formatQuantity(value), "$value")
        }

        assertEquals("1000", formatQuantity(1000.0, grouping = false))
        assertEquals("0.5", formatQuantity(0.5, allowFractions = false))
    }

    @Test
    fun formatAmountForUnit_switchesToLargerUnits() {
        val cases = listOf(
            Triple(999.0, "g", "999g"), Triple(1000.0, "g", "1kg"), Triple(1234.0, "g", "1.234kg"),
            Triple(1234567.0, "g", "1,234.567kg"), Triple(1234.567891, "g", "1.234567891kg"),
            Triple(1000.000001, "g", "1.000000001kg"), Triple(1500.0, "mL", "1.5L"), Triple(2000.0, "cc", "2L"),
            Triple(500.0, "cc", "500cc"), Triple(-1500.0, "g", "-1.5kg"), Triple(0.5, "kg", "0.5kg"),
            Triple(1500.0, "個", "1,500個"), Triple(1500.0, null, "1,500"), Triple(1.0 / 3, "本", "1/3本"),
        )

        for ((quantity, unit, expected) in cases) {
            assertEquals(expected, formatAmountForUnit(quantity, unit), "$quantity $unit")
        }
    }

    @Test
    fun formatStockAmountWithUnit_roundsThenSwitches() {
        val cases = listOf(
            Triple(1333.333, StockUnitCode.G, "1.333kg"), Triple(999.6, StockUnitCode.G, "1kg"),
            Triple(999.4, StockUnitCode.G, "999g"), Triple(2500.0, StockUnitCode.Ml, "2.5L"),
            Triple(1.818182, StockUnitCode.Count, "1.8個"), Triple(1.0 / 3, StockUnitCode.Count, "1/3個"),
        )

        for ((quantity, code, expected) in cases) {
            val label = if (code == StockUnitCode.Count) "個" else code.name.lowercase()

            assertEquals(expected, formatStockAmountWithUnit(quantity, code, label), "$quantity $code")
        }
    }

    @Test
    fun replaceKanjiNumbers_replaces() {
        assertEquals("1と1/2個、0.5本、12g", replaceKanjiNumbers("一と二分の一個、半本、十二g"))
    }
}
