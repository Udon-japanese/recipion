package app.recipion.shared.shopping

import app.recipion.shared.config.SHOPPING_MEMO_ADOPTION_CASES_JSON
import app.recipion.shared.config.SHOPPING_SYNC_RECORDS_JSON
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlin.test.Test
import kotlin.test.assertEquals

@Serializable
private data class MemoJson(
    val items: List<ShoppingItem>,
    val stores: List<ShoppingStore>,
    val branches: List<ShoppingBranch>,
    val storeDefaults: List<ShoppingStoreDefault>,
    val conversionMemories: List<ShoppingConversionMemory>,
    val itemMemories: List<ShoppingItemMemory>,
    val mergedStoreCount: Int? = null,
) {
    fun data() = ShoppingMemoData(items, stores, branches, storeDefaults, conversionMemories, itemMemories)
}

@Serializable
private data class PlanCase(val name: String, val guest: MemoJson, val account: MemoJson, val expected: MemoJson)

@Serializable
private data class HasMemoCase(val name: String, val guest: MemoJson, val expected: Boolean)

@Serializable
private data class AdoptionCases(val plan: List<PlanCase>, val hasMemo: List<HasMemoCase>)

@Serializable
private data class RecordCases(val records: List<VersionedShoppingRecord>)

// 数の書き方（1 と 1.0）だけの違いは、同じとみなす。
private fun normalized(element: JsonElement): Any? =
    when (element) {
        is JsonNull -> null
        is JsonObject -> element.mapValues { normalized(it.value) }
        is JsonArray -> element.map { normalized(it) }
        is JsonPrimitive -> if (element.isString) element.content else element.booleanOrNull ?: element.doubleOrNull
    }

class ShoppingSharedDataTest {
    private val adoption = Json.decodeFromString<AdoptionCases>(SHOPPING_MEMO_ADOPTION_CASES_JSON)

    @Test
    fun adoptionMatchesWeb() {
        for (case in adoption.plan) {
            assertEquals(
                ShoppingMemoAdoption(case.expected.data(), case.expected.mergedStoreCount ?: 0),
                planShoppingMemoAdoption(case.guest.data(), case.account.data()),
                case.name,
            )
        }

        for (case in adoption.hasMemo) {
            assertEquals(case.expected, hasShoppingMemoToAdopt(case.guest.data()), case.name)
        }
    }

    @Test
    fun recordsRoundTripInWebShape() {
        for (record in Json.decodeFromString<RecordCases>(SHOPPING_SYNC_RECORDS_JSON).records) {
            record.validate()
            val written = record.decodedData()?.let { encodeShoppingRecordData(it) }

            assertEquals(record.data?.let { normalized(it) }, written?.let { normalized(it) }, "${record.kind} ${record.id}")
        }
    }
}
