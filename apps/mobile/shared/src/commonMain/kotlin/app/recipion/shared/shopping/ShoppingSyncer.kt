package app.recipion.shared.shopping

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

// 同期を1つずつ行う（画面の操作とログアウトから、同時に呼ばれても、重ねない）。
class ShoppingSyncer(
    val store: ShoppingMemoStore,
    private val remote: ShoppingSyncRemote,
) {
    private val mutex = Mutex()

    suspend fun sync(ownerScope: OwnerScope.User): SyncShoppingMemoResult =
        mutex.withLock { syncShoppingMemo(ownerScope, store, remote) }
}
