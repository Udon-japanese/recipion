package app.recipion.shared.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.recipion.shared.api.ApiException
import app.recipion.shared.api.Profile
import app.recipion.shared.api.RecipionApi
import app.recipion.shared.api.userMessageOf
import app.recipion.shared.shopping.OwnerScope
import app.recipion.shared.shopping.ShoppingSyncer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

sealed interface SessionState {
    data object Checking : SessionState

    data object SignedOut : SessionState

    // profile は、読み込めるまで（オフラインなど）null。
    data class SignedIn(val userId: String, val profile: Profile?) : SessionState {
        val ownerScope: OwnerScope.User get() = OwnerScope.User(userId)
    }

    data class LoadFailed(val message: String) : SessionState
}

class SessionViewModel(
    private val api: RecipionApi,
    private val shopping: ShoppingSyncer,
) : ViewModel() {
    private val mutableState = MutableStateFlow<SessionState>(SessionState.Checking)

    val state: StateFlow<SessionState> = mutableState.asStateFlow()

    val updateRequired: StateFlow<Boolean> = api.updateRequired

    // ログアウトの前に、送れていない買い物メモの変更の数（確かめる間は表示する）。null は、確かめていない。
    private val mutableUnsentCount = MutableStateFlow<Int?>(null)

    val unsentCount: StateFlow<Int?> = mutableUnsentCount.asStateFlow()

    init {
        load()
    }

    fun load() {
        mutableState.value = SessionState.Checking

        viewModelScope.launch {
            if (!api.hasSession()) {
                mutableState.value = SessionState.SignedOut
                return@launch
            }

            val userId = api.userId() ?: try {
                api.fetchUserId()
            } catch (error: Throwable) {
                if (error is CancellationException) throw error
                mutableState.value = signedOutOr(error)
                return@launch
            }

            mutableState.value = SessionState.SignedIn(userId, profile = null)
            loadProfile(userId)
        }
    }

    private suspend fun loadProfile(userId: String) {
        try {
            val profile = api.profile()
            mutableState.update { current ->
                if (current is SessionState.SignedIn && current.userId == userId) current.copy(profile = profile) else current
            }
        } catch (error: Throwable) {
            if (error is CancellationException) throw error
            // オフラインでも、メモは使える。名前は、次に開いたときに読む。
            if (error is ApiException && error.status == 401) {
                mutableState.value = SessionState.SignedOut
            }
        }
    }

    private fun signedOutOr(error: Throwable): SessionState =
        if (error is ApiException && error.status == 401) SessionState.SignedOut else SessionState.LoadFailed(userMessageOf(error))

    // まず送ってみる。送れない変更が残れば、消してよいかを聞く。
    fun signOut() {
        val current = state.value as? SessionState.SignedIn ?: return

        viewModelScope.launch {
            try {
                shopping.sync(current.ownerScope)
            } catch (error: Throwable) {
                if (error is CancellationException) throw error
            }

            val count = shopping.store.countPending(current.ownerScope)

            if (count > 0) {
                mutableUnsentCount.value = count
            } else {
                finishSignOut(current)
            }
        }
    }

    fun confirmSignOut() {
        val current = state.value as? SessionState.SignedIn ?: return

        mutableUnsentCount.value = null
        viewModelScope.launch { finishSignOut(current) }
    }

    fun cancelSignOut() {
        mutableUnsentCount.value = null
    }

    // 共用の端末で、次の人に残さないよう、この端末からその人のメモを消す（次にログインしたら、サーバーから受け取り直す）。
    private suspend fun finishSignOut(current: SessionState.SignedIn) {
        try {
            api.signOut()
        } catch (error: Throwable) {
            if (error is CancellationException) throw error
        }
        shopping.store.clear(current.ownerScope)
        mutableState.value = SessionState.SignedOut
    }
}
