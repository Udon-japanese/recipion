package app.recipion.shared.shopping

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

data class ShoppingMemoUiState(
    val isLoading: Boolean = true,
    val items: List<ShoppingItem> = emptyList(),
    val draftName: String = "",
    // 送っていない変更の数（ゲストは 0）。
    val pendingCount: Int = 0,
    val syncFailed: Boolean = false,
    // ログインする前のメモを移すか、聞く（まだ買っていない項目の数）。null は、聞かない。
    val guestAdoptionItemCount: Int? = null,
    val errorMessage: String? = null,
) {
    val canAdd: Boolean get() = draftName.isNotBlank()
}

// 変更をまとめて送るまで待つ時間。
private const val SYNC_DEBOUNCE_MS = 1_000L

class ShoppingMemoViewModel(
    private val ownerScope: OwnerScope,
    private val syncer: ShoppingSyncer,
) : ViewModel() {
    private val store = syncer.store
    private val mutableState = MutableStateFlow(ShoppingMemoUiState())

    val state: StateFlow<ShoppingMemoUiState> = mutableState.asStateFlow()

    private var allItems: List<ShoppingItem> = emptyList()
    private var debounceJob: Job? = null
    private var adoptionDismissed = false

    init {
        viewModelScope.launch {
            store.watch(ownerScope).collect { memo ->
                allItems = memo.items
                mutableState.update { it.copy(isLoading = false, items = visibleShoppingItems(memo.items)) }
            }
        }

        if (ownerScope is OwnerScope.User) {
            viewModelScope.launch {
                store.watchPendingCount(ownerScope).collect { count -> mutableState.update { it.copy(pendingCount = count) } }
            }
            viewModelScope.launch {
                store.watch(OwnerScope.Guest).collect { guest ->
                    val count = guest.items.count { it.status != ShoppingItemStatus.Purchased && it.branchId == null }
                    val ask = !adoptionDismissed && hasShoppingMemoToAdopt(guest)
                    mutableState.update { it.copy(guestAdoptionItemCount = if (ask) count else null) }
                }
            }
            sync()
        }
    }

    fun updateDraft(text: String) {
        mutableState.update { it.copy(draftName = text, errorMessage = null) }
    }

    fun add() {
        val item = createShoppingItem(state.value.draftName, allItems)

        if (item == null) {
            mutableState.update { it.copy(errorMessage = "名前は${MAX_SHOPPING_ITEM_NAME_LENGTH}文字までで入力してください") }
            return
        }

        mutableState.update { it.copy(draftName = "") }
        write { store.put(ownerScope, listOf(item)) }
    }

    fun toggle(id: String) {
        val item = allItems.find { it.id == id } ?: return

        write { store.put(ownerScope, listOf(toggleShoppingItem(item))) }
    }

    fun delete(id: String) {
        write { store.delete(ownerScope, ShoppingRecordKind.Item, id) }
    }

    fun adoptGuest() {
        val user = ownerScope as? OwnerScope.User ?: return

        mutableState.update { it.copy(guestAdoptionItemCount = null) }
        write { store.adoptGuest(user) }
    }

    fun dismissGuestAdoption() {
        adoptionDismissed = true
        mutableState.update { it.copy(guestAdoptionItemCount = null) }
    }

    // 開いたとき・前面に戻ったときに呼ぶ。
    fun sync() {
        val user = ownerScope as? OwnerScope.User ?: return

        viewModelScope.launch { runSync(user) }
    }

    // 続けて書いたときは、まとめて送る。送っている最中の同期は止めない（待つのは、始める前だけ）。
    private fun scheduleSync() {
        if (ownerScope !is OwnerScope.User) return

        debounceJob?.cancel()
        debounceJob = viewModelScope.launch {
            delay(SYNC_DEBOUNCE_MS)
            sync()
        }
    }

    private suspend fun runSync(user: OwnerScope.User) {
        try {
            syncer.sync(user)
            mutableState.update { it.copy(syncFailed = false) }
        } catch (error: Throwable) {
            if (error is CancellationException) throw error
            // オフラインなど。変更は端末に残り、次の同期で送る。
            mutableState.update { it.copy(syncFailed = true) }
        }
    }

    private fun write(action: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                action()
                scheduleSync()
            } catch (error: Throwable) {
                if (error is CancellationException) throw error
                mutableState.update { it.copy(errorMessage = "保存できませんでした") }
            }
        }
    }
}
