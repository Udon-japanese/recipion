package app.recipion.shared.shopping

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonClassDiscriminator
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject

// 同期の行の種類と、やりとりの形（Web の shopping-sync-record.ts・shopping-sync-push.ts と同じ）。

@Serializable
enum class ShoppingRecordKind {
    @SerialName("item")
    Item,

    @SerialName("store")
    Store,

    @SerialName("branch")
    Branch,

    @SerialName("storeDefault")
    StoreDefault,

    @SerialName("conversionMemory")
    ConversionMemory,

    @SerialName("itemMemory")
    ItemMemory,
}

val ShoppingRecordData.kind: ShoppingRecordKind
    get() = when (this) {
        is ShoppingItem -> ShoppingRecordKind.Item
        is ShoppingStore -> ShoppingRecordKind.Store
        is ShoppingBranch -> ShoppingRecordKind.Branch
        is ShoppingStoreDefault -> ShoppingRecordKind.StoreDefault
        is ShoppingConversionMemory -> ShoppingRecordKind.ConversionMemory
        is ShoppingItemMemory -> ShoppingRecordKind.ItemMemory
    }

object ShoppingSyncLimits {
    const val MAX_PUSH_RECORDS = 100
    const val MAX_UNACKED_CHANGE_IDS = 5
}

internal val shoppingJson = Json { ignoreUnknownKeys = true }

private fun serializerOf(kind: ShoppingRecordKind): KSerializer<out ShoppingRecordData> =
    when (kind) {
        ShoppingRecordKind.Item -> ShoppingItem.serializer()
        ShoppingRecordKind.Store -> ShoppingStore.serializer()
        ShoppingRecordKind.Branch -> ShoppingBranch.serializer()
        ShoppingRecordKind.StoreDefault -> ShoppingStoreDefault.serializer()
        ShoppingRecordKind.ConversionMemory -> ShoppingConversionMemory.serializer()
        ShoppingRecordKind.ItemMemory -> ShoppingItemMemory.serializer()
    }

// 中身を、種類ごとの形で読む。形が違うか、行の ID と中身の ID が食い違えば、例外（違う行を、別の ID で上書きしない）。
fun decodeShoppingRecordData(kind: ShoppingRecordKind, id: String, data: JsonObject): ShoppingRecordData {
    val decoded = shoppingJson.decodeFromJsonElement(serializerOf(kind), data)

    require(decoded.recordId == id) { "同期する行の ID が、中身と合いません" }

    return decoded
}

fun encodeShoppingRecordData(data: ShoppingRecordData): JsonObject =
    when (data) {
        is ShoppingItem -> shoppingJson.encodeToJsonElement(ShoppingItem.serializer(), data)
        is ShoppingStore -> shoppingJson.encodeToJsonElement(ShoppingStore.serializer(), data)
        is ShoppingBranch -> shoppingJson.encodeToJsonElement(ShoppingBranch.serializer(), data)
        is ShoppingStoreDefault -> shoppingJson.encodeToJsonElement(ShoppingStoreDefault.serializer(), data)
        is ShoppingConversionMemory -> shoppingJson.encodeToJsonElement(ShoppingConversionMemory.serializer(), data)
        is ShoppingItemMemory -> shoppingJson.encodeToJsonElement(ShoppingItemMemory.serializer(), data)
    }.jsonObject

// サーバーにある1行（消した行は data が null）。
@Serializable
data class VersionedShoppingRecord(
    val kind: ShoppingRecordKind,
    val id: String,
    val deleted: Boolean,
    val data: JsonObject?,
    val version: Long,
) {
    // 形を確かめた中身（消した行は null）。
    fun decodedData(): ShoppingRecordData? = data?.let { decodeShoppingRecordData(kind, id, it) }

    fun validate() {
        require(deleted == (data == null)) { "同期する行の形が違います" }
        decodedData()
    }
}

// 端末が送る1行。どの変更か（changeId）と、どの版をもとに変えたか（baseVersion）を持つ。
@Serializable
data class ShoppingPushRecord(
    val kind: ShoppingRecordKind,
    val id: String,
    val deleted: Boolean,
    val data: JsonObject?,
    val changeId: String,
    // 変えたときに、端末が知っていたサーバーの版（サーバーにまだない行は 0）。
    val baseVersion: Long,
    // この端末が前に送ったが、届いたか分からない（返事を受け取れなかった）変更。
    val unackedChangeIds: List<String>,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonClassDiscriminator("status")
sealed interface ShoppingPushResult {
    @Serializable
    @SerialName("applied")
    data class Applied(val version: Long) : ShoppingPushResult

    // 別の端末が先に変えていた。サーバーの行（current）を残し、端末の変更は当てない。
    @Serializable
    @SerialName("conflict")
    data class Conflict(val current: VersionedShoppingRecord) : ShoppingPushResult
}

@Serializable
data class ShoppingSyncPage(
    val records: List<VersionedShoppingRecord>,
    val cursor: Long,
    val hasMore: Boolean,
)
