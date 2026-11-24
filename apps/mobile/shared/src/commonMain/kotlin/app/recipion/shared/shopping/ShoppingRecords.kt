package app.recipion.shared.shopping

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// 買い物メモの6種類の行の中身。形は Web の shopping-record-schemas.ts と同じ（サーバーとの同期で、そのままやりとりする）。
// 既定値のない欄は、null でも必ず書き出す（Web の nullable は、欄がないと断る）。
// 既定値の null を持つ欄は、Web の optional（欄がないか、値がある）で、null のときは書き出さない。

sealed interface ShoppingRecordData {
    val recordId: String
}

@Serializable
enum class InventoryTrackingMode {
    @SerialName("exact")
    Exact,

    @SerialName("estimated")
    Estimated,

    @SerialName("presence")
    Presence,
}

@Serializable
enum class StockUnitCode {
    @SerialName("count")
    Count,

    @SerialName("g")
    Gram,

    @SerialName("ml")
    Milliliter,
}

@Serializable
data class InventoryConversion(
    val inputUnitCode: String,
    val stockUnitCode: StockUnitCode,
    val stockUnitLabel: String,
    val stockQuantityPerInputUnit: Double,
    val trackingMode: InventoryTrackingMode,
    val isApproximate: Boolean? = null,
)

@Serializable
enum class CategoryAssignment {
    @SerialName("automatic")
    Automatic,

    @SerialName("manual")
    Manual,
}

@Serializable
enum class ShoppingItemStatus {
    @SerialName("pending")
    Pending,

    @SerialName("checked")
    Checked,

    @SerialName("purchased")
    Purchased,
}

@Serializable
enum class BranchSide {
    @SerialName("condition")
    Condition,

    @SerialName("then")
    Then,

    @SerialName("else")
    Else,
}

@Serializable
data class ShoppingItem(
    val id: String,
    val name: String,
    val quantity: Double,
    val unitLabel: String?,
    val inventoryConversion: InventoryConversion?,
    val categoryId: String?,
    val categoryAssignment: CategoryAssignment?,
    val storeId: String?,
    val branchId: String?,
    val branchSide: BranchSide?,
    val status: ShoppingItemStatus,
    val sortOrder: Double,
    val createdAt: String,
    val updatedAt: String,
) : ShoppingRecordData {
    override val recordId: String get() = id
}

@Serializable
data class ShoppingStore(
    val id: String,
    val name: String,
    val sortOrder: Int,
    val createdAt: String,
) : ShoppingRecordData {
    override val recordId: String get() = id
}

@Serializable
data class ShoppingBranch(
    val id: String,
    val condition: String,
    val thenLabel: String?,
    val elseLabel: String?,
    val sortOrder: Int,
    val createdAt: String,
) : ShoppingRecordData {
    override val recordId: String get() = id
}

@Serializable
data class ShoppingStoreDefault(
    val nameKey: String,
    val storeId: String,
) : ShoppingRecordData {
    override val recordId: String get() = nameKey
}

@Serializable
data class ShoppingConversionMemory(
    val key: String,
    val nameKey: String,
    val unitLabel: String?,
    val inventoryConversion: InventoryConversion,
    val quantity: Double? = null,
    val usedAt: Double,
) : ShoppingRecordData {
    override val recordId: String get() = key
}

@Serializable
data class ShoppingItemMemory(
    val nameKey: String,
    val quantity: Double,
    val unitLabel: String?,
    val categoryId: String?,
    val categoryAssignment: CategoryAssignment?,
    val usedAt: Double,
) : ShoppingRecordData {
    override val recordId: String get() = nameKey
}

// 1人の買い物メモの、6種類の行。
data class ShoppingMemoData(
    val items: List<ShoppingItem> = emptyList(),
    val stores: List<ShoppingStore> = emptyList(),
    val branches: List<ShoppingBranch> = emptyList(),
    val storeDefaults: List<ShoppingStoreDefault> = emptyList(),
    val conversionMemories: List<ShoppingConversionMemory> = emptyList(),
    val itemMemories: List<ShoppingItemMemory> = emptyList(),
) {
    fun records(): List<ShoppingRecordData> =
        items + stores + branches + storeDefaults + conversionMemories + itemMemories
}

fun shoppingMemoDataOf(records: Iterable<ShoppingRecordData>): ShoppingMemoData {
    val list = records.toList()

    return ShoppingMemoData(
        items = list.filterIsInstance<ShoppingItem>(),
        stores = list.filterIsInstance<ShoppingStore>(),
        branches = list.filterIsInstance<ShoppingBranch>(),
        storeDefaults = list.filterIsInstance<ShoppingStoreDefault>(),
        conversionMemories = list.filterIsInstance<ShoppingConversionMemory>(),
        itemMemories = list.filterIsInstance<ShoppingItemMemory>(),
    )
}
