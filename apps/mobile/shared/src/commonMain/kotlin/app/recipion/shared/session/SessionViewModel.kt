package app.recipion.shared.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.recipion.shared.api.ApiException
import app.recipion.shared.api.Profile
import app.recipion.shared.api.RecipionApi
import app.recipion.shared.api.userMessageOf
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlin.coroutines.cancellation.CancellationException

sealed interface SessionState {
    data object Checking : SessionState

    data object SignedOut : SessionState

    data class SignedIn(val profile: Profile) : SessionState

    data class LoadFailed(val message: String) : SessionState
}

class SessionViewModel(private val api: RecipionApi) : ViewModel() {
    private val mutableState = MutableStateFlow<SessionState>(SessionState.Checking)

    val state: StateFlow<SessionState> = mutableState.asStateFlow()

    val updateRequired: StateFlow<Boolean> = api.updateRequired

    init {
        load()
    }

    fun load() {
        mutableState.value = SessionState.Checking

        viewModelScope.launch {
            mutableState.value = if (!api.hasSession()) {
                SessionState.SignedOut
            } else {
                try {
                    SessionState.SignedIn(api.profile())
                } catch (error: Throwable) {
                    if (error is ApiException && error.status == 401) {
                        SessionState.SignedOut
                    } else {
                        SessionState.LoadFailed(userMessageOf(error))
                    }
                }
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            try {
                api.signOut()
            } catch (error: Throwable) {
                if (error is CancellationException) throw error
            }
            mutableState.value = SessionState.SignedOut
        }
    }
}
