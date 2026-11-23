package app.recipion.shared.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.recipion.shared.api.RecipionApi
import app.recipion.shared.api.userMessageOf
import app.recipion.shared.auth.otpDigitsFromInput
import app.recipion.shared.auth.otpLength
import app.recipion.shared.auth.parseEmailAddress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LoginStep { Email, Code }

data class LoginUiState(
    val step: LoginStep = LoginStep.Email,
    val email: String = "",
    val code: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
) {
    val canSendCode: Boolean get() = email.isNotBlank() && !isSubmitting

    val canSignIn: Boolean get() = code.length == otpLength && !isSubmitting
}

class LoginViewModel(
    private val api: RecipionApi,
    private val onSignedIn: () -> Unit,
) : ViewModel() {
    private val mutableState = MutableStateFlow(LoginUiState())

    val state: StateFlow<LoginUiState> = mutableState.asStateFlow()

    fun updateEmail(text: String) {
        mutableState.update { it.copy(email = text, errorMessage = null) }
    }

    fun updateCode(raw: String) {
        val code = otpDigitsFromInput(raw)
        mutableState.update { it.copy(code = code, errorMessage = null) }

        if (code.length == otpLength) {
            signIn()
        }
    }

    fun sendCode() {
        if (!state.value.canSendCode) return

        val email = parseEmailAddress(state.value.email)

        if (email == null) {
            mutableState.update { it.copy(errorMessage = "メールアドレスを確認してください") }
            return
        }

        submit {
            api.sendCode(email)
            mutableState.update { it.copy(step = LoginStep.Code, email = email, code = "") }
        }
    }

    fun signIn() {
        if (!state.value.canSignIn) return

        val current = state.value

        submit(onError = { mutableState.update { it.copy(code = "") } }) {
            api.signIn(current.email, current.code)
            mutableState.value = LoginUiState()
            onSignedIn()
        }
    }

    fun backToEmail() {
        mutableState.update { it.copy(step = LoginStep.Email, code = "", errorMessage = null) }
    }

    private fun submit(onError: () -> Unit = {}, action: suspend () -> Unit) {
        mutableState.update { it.copy(isSubmitting = true, errorMessage = null) }

        viewModelScope.launch {
            try {
                action()
            } catch (error: Throwable) {
                val message = userMessageOf(error)
                onError()
                mutableState.update { it.copy(errorMessage = message) }
            } finally {
                mutableState.update { it.copy(isSubmitting = false) }
            }
        }
    }
}
