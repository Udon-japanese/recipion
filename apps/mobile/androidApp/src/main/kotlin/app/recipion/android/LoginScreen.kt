package app.recipion.android

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.recipion.shared.auth.otpExpiresInMinutes
import app.recipion.shared.auth.otpLength
import app.recipion.shared.session.LoginStep
import app.recipion.shared.session.LoginViewModel

@Composable
fun LoginScreen(viewModel: LoginViewModel, onCancel: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    BackHandler(onBack = onCancel)

    Column(
        modifier = Modifier.verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("ログイン", style = MaterialTheme.typography.headlineSmall)

        when (state.step) {
            LoginStep.Email -> {
                Text("メールアドレスにログイン用の${otpLength}桁のコードを送ります。パスワードは不要です。初めての方は自動でアカウントが作られます。")
                OutlinedTextField(
                    value = state.email,
                    onValueChange = viewModel::updateEmail,
                    label = { Text("メールアドレス") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { viewModel.sendCode() }),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = viewModel::sendCode, enabled = state.canSendCode, modifier = Modifier.fillMaxWidth()) {
                    Text(if (state.isSubmitting) "送信中" else "コードを送る")
                }
                ConsentNote()
            }
            LoginStep.Code -> {
                Text("${state.email} に${otpLength}桁のコードを送りました（${otpExpiresInMinutes}分間有効）。届かないときは、迷惑メールのフォルダも確認してください。")
                OutlinedTextField(
                    value = state.code,
                    onValueChange = viewModel::updateCode,
                    label = { Text("ログイン用コード（${otpLength}桁）") },
                    singleLine = true,
                    isError = state.errorMessage != null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { viewModel.signIn() }),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = viewModel::signIn, enabled = state.canSignIn, modifier = Modifier.fillMaxWidth()) {
                    Text(if (state.isSubmitting) "確認中" else "ログインする")
                }
                OutlinedButton(onClick = viewModel::resendCode, enabled = state.canResendCode, modifier = Modifier.fillMaxWidth()) {
                    Text(
                        if (state.resendCooldownSeconds > 0) "コードを再送（あと${state.resendCooldownSeconds}秒）" else "コードを再送",
                    )
                }
                TextButton(onClick = viewModel::backToEmail, enabled = !state.isSubmitting) {
                    Text("メールアドレスを変更")
                }
            }
        }

        state.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        TextButton(onClick = onCancel) { Text("ログインせずに使う") }
    }
}

@Composable
private fun ConsentNote() {
    Text(
        buildAnnotatedString {
            append("ログインすると、")
            withLink(LinkAnnotation.Url("https://recipion.app/terms")) { append("利用規約") }
            append("と")
            withLink(LinkAnnotation.Url("https://recipion.app/privacy")) { append("プライバシーポリシー") }
            append("（外国にある事業者への情報の送信を含む）に同意したものとみなします。")
        },
        style = MaterialTheme.typography.bodySmall,
    )
}
