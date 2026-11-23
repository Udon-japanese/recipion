package app.recipion.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.recipion.shared.quantity.formatAmountForUnit
import app.recipion.shared.quantity.parseQuantityInput
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    LoginScreen(AuthApi())
                }
            }
        }
    }
}

@Composable
private fun LoginScreen(api: AuthApi) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var codeSent by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("recipion P0：ログイン", style = MaterialTheme.typography.titleLarge)
        Text("shared: 1,500g → ${formatAmountForUnit(1500.0, "g")}／「1と1/2」→ ${parseQuantityInput("1と1/2")}")

        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("メールアドレス") })
        Button(onClick = {
            scope.launch {
                message = runCatching { api.sendCode(email.trim()) }
                    .fold({ codeSent = true; "コードを送りました" }, { "送れませんでした：${it.message}" })
            }
        }) { Text("コードを送る") }

        if (codeSent) {
            OutlinedTextField(value = code, onValueChange = { code = it }, label = { Text("6桁のコード") })
            Button(onClick = {
                scope.launch {
                    message = runCatching {
                        val token = api.signIn(email.trim(), code.trim())
                        "ログインしました：${api.profileName(token)}"
                    }.getOrElse { "ログインできませんでした：${it.message}" }
                }
            }) { Text("ログインする") }
        }

        Text(message)
    }
}
