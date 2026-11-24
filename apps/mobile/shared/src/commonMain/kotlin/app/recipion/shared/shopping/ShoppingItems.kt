package app.recipion.shared.shopping

import kotlin.time.Clock
import kotlin.time.ExperimentalTime
import kotlin.time.Instant
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

// 項目の名前の上限（Web の shoppingRecordLimits.maxNameLength）。
const val MAX_SHOPPING_ITEM_NAME_LENGTH = 100

// Web の Date#toISOString と同じく、ミリ秒までの UTC の時刻。
@OptIn(ExperimentalTime::class)
fun isoTimestampNow(): String = Instant.fromEpochMilliseconds(Clock.System.now().toEpochMilliseconds()).toString()

@OptIn(ExperimentalUuidApi::class)
fun randomRecordId(): String = Uuid.random().toString()

// 一覧に出す項目（購入済みと、条件つきメモの中の項目は出さない）。
fun visibleShoppingItems(items: List<ShoppingItem>): List<ShoppingItem> =
    items.filter { it.status != ShoppingItemStatus.Purchased && it.branchId == null }.sortedBy { it.sortOrder }

// 名前だけの項目を作る（数量 1、単位・店・カテゴリなし）。名前が空か長すぎれば null。
fun createShoppingItem(
    name: String,
    existing: List<ShoppingItem>,
    now: String = isoTimestampNow(),
    createId: () -> String = ::randomRecordId,
): ShoppingItem? {
    val trimmed = name.trim()

    if (trimmed.isEmpty() || trimmed.length > MAX_SHOPPING_ITEM_NAME_LENGTH) return null

    return ShoppingItem(
        id = createId(),
        name = trimmed,
        quantity = 1.0,
        unitLabel = null,
        inventoryConversion = null,
        categoryId = null,
        categoryAssignment = null,
        storeId = null,
        branchId = null,
        branchSide = null,
        status = ShoppingItemStatus.Pending,
        sortOrder = existing.maxOfOrNull { it.sortOrder + 1 } ?: 0.0,
        createdAt = now,
        updatedAt = now,
    )
}

fun toggleShoppingItem(item: ShoppingItem, now: String = isoTimestampNow()): ShoppingItem =
    when (item.status) {
        ShoppingItemStatus.Purchased -> item
        ShoppingItemStatus.Pending -> item.copy(status = ShoppingItemStatus.Checked, updatedAt = now)
        ShoppingItemStatus.Checked -> item.copy(status = ShoppingItemStatus.Pending, updatedAt = now)
    }
