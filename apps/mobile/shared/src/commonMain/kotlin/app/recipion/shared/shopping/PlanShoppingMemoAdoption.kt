package app.recipion.shared.shopping

import app.recipion.shared.text.normalizeNfkc

// Web の plan-shopping-memo-adoption.ts と同じ（共通のテストデータで確かめる）。

data class ShoppingMemoAdoption(
    val data: ShoppingMemoData,
    // 同じ名前の店があったので、1つにまとめた数。
    val mergedStoreCount: Int,
)

private fun nextSortOrder(sortOrders: List<Double>): Double =
    sortOrders.fold(0.0) { max, sortOrder -> maxOf(max, sortOrder + 1) }

private fun storeNameKey(name: String): String = normalizeNfkc(name.trim())

// ログインする前（ゲスト）の買い物メモを、アカウントのメモに移すときの、足す行。
// - 店：同じ名前の店がアカウントにあれば、そちらにまとめる（項目・いつも買う店の店も付け替える）。なければ、後ろに足す。
// - 項目・条件つきのメモ：アカウントのメモの後ろに、ゲストの並びのまま足す。
// - いつも買う店・換算の記憶・いつもの買い方：同じ食材（×単位）がアカウントにあれば、アカウントの方を残す。
fun planShoppingMemoAdoption(guest: ShoppingMemoData, account: ShoppingMemoData): ShoppingMemoAdoption {
    val accountStoreIdByName = account.stores.associate { storeNameKey(it.name) to it.id }
    val storeIdMap = mutableMapOf<String, String>()
    val stores = mutableListOf<ShoppingStore>()
    var storeSortOrder = nextSortOrder(account.stores.map { it.sortOrder.toDouble() }).toInt()

    for (store in guest.stores) {
        val sameNameId = accountStoreIdByName[storeNameKey(store.name)]

        if (sameNameId != null) {
            storeIdMap[store.id] = sameNameId
            continue
        }

        stores += store.copy(sortOrder = storeSortOrder)
        storeSortOrder += 1
    }

    fun remapStoreId(storeId: String?): String? = storeId?.let { storeIdMap[it] ?: it }

    val itemSortStart = nextSortOrder(account.items.map { it.sortOrder })
    val branchSortStart = nextSortOrder(account.branches.map { it.sortOrder.toDouble() }).toInt()
    val accountDefaultKeys = account.storeDefaults.map { it.nameKey }.toSet()
    // 換算の記憶は、食材ごとに、アカウントの方を残す（食材ごとの件数の上限を超えないように）。
    val accountMemoryNameKeys = account.conversionMemories.map { it.nameKey }.toSet()
    val accountItemMemoryKeys = account.itemMemories.map { it.nameKey }.toSet()

    return ShoppingMemoAdoption(
        data = ShoppingMemoData(
            items = guest.items.sortedBy { it.sortOrder }.mapIndexed { index, item ->
                item.copy(storeId = remapStoreId(item.storeId), sortOrder = itemSortStart + index)
            },
            stores = stores,
            branches = guest.branches.sortedBy { it.sortOrder }.mapIndexed { index, branch ->
                branch.copy(sortOrder = branchSortStart + index)
            },
            storeDefaults = guest.storeDefaults
                .filter { it.nameKey !in accountDefaultKeys }
                .map { it.copy(storeId = remapStoreId(it.storeId) ?: it.storeId) },
            conversionMemories = guest.conversionMemories.filter { it.nameKey !in accountMemoryNameKeys },
            itemMemories = guest.itemMemories.filter { it.nameKey !in accountItemMemoryKeys },
        ),
        mergedStoreCount = storeIdMap.size,
    )
}

// 移すものがあるか（購入済みの項目は、もう在庫に入った記録なので、それだけなら聞かない）。
fun hasShoppingMemoToAdopt(guest: ShoppingMemoData): Boolean =
    guest.items.any { it.status != ShoppingItemStatus.Purchased } ||
        guest.stores.isNotEmpty() ||
        guest.branches.isNotEmpty()
