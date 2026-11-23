package app.recipion.shared.quantity

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

// 答えは kotlin-quantity-parity.test.ts が書き出す（先に Vitest を回す）。
class TsParityJvmTest {
    private val answers = File("build/ts-answers.json").takeIf { it.exists() }?.let {
        Json.parseToJsonElement(it.readText()).jsonObject
    }

    private fun number(value: JsonPrimitive): Double = if (value.content == "-0") -0.0 else value.content.toDouble()

    @Test
    fun parse_matchesTypeScript() {
        val rows = answers?.getValue("parse")?.jsonArray ?: return
        val differences = rows.map { it.jsonArray }.filter { row ->
            val text = row[0].jsonPrimitive.content
            val expected = if (row[1] is JsonNull) null else number(row[1].jsonPrimitive)

            parseQuantityInput(text) != expected || replaceKanjiNumbers(text) != row[2].jsonPrimitive.content
        }

        assertEquals(emptyList(), differences.take(10))
    }

    @Test
    fun format_matchesTypeScript() {
        val rows = answers?.getValue("format")?.jsonArray ?: return
        val differences = rows.map { it.jsonArray }.mapNotNull { row: JsonArray ->
            val value = number(row[0].jsonPrimitive)
            val unit = if (row[1] is JsonNull) null else row[1].jsonPrimitive.content
            val quantity = formatQuantity(value)
            val amount = formatAmountForUnit(value, unit)

            if (quantity != row[2].jsonPrimitive.content || amount != row[3].jsonPrimitive.content) {
                "$value $unit: kotlin=$quantity/$amount ts=${row[2]}/${row[3]}"
            } else {
                null
            }
        }

        assertEquals(emptyList(), differences.take(10))
    }
}
