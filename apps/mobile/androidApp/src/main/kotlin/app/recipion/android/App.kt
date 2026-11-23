package app.recipion.android

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import app.recipion.shared.api.RecipionApi
import app.recipion.shared.session.LoginViewModel
import app.recipion.shared.session.SessionState
import app.recipion.shared.session.SessionViewModel

@Composable
fun App(api: RecipionApi) {
    val session = viewModel { SessionViewModel(api) }
    val state by session.state.collectAsStateWithLifecycle()
    val updateRequired by session.updateRequired.collectAsStateWithLifecycle()

    Box(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
        when (val current = state) {
            SessionState.Checking -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            SessionState.SignedOut -> LoginScreen(viewModel { LoginViewModel(api, onSignedIn = session::load) })
            is SessionState.SignedIn -> HomeScreen(current.profile, onSignOut = session::signOut)
            is SessionState.LoadFailed -> LoadFailed(current.message, onRetry = session::load)
        }
    }

    if (updateRequired) {
        UpdateRequiredDialog()
    }
}

@Composable
private fun LoadFailed(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message)
        Button(onClick = onRetry) { Text("もう一度読み込む") }
    }
}

@Composable
private fun UpdateRequiredDialog() {
    val context = LocalContext.current
    var dismissed by remember { mutableStateOf(false) }

    if (dismissed) return

    AlertDialog(
        onDismissRequest = { dismissed = true },
        title = { Text("アプリを更新してください") },
        text = { Text("アプリが新しくなりました。更新するまで、保存や読み込みができません。入力中の内容は、更新すると消えます。") },
        dismissButton = { TextButton(onClick = { dismissed = true }) { Text("あとで") } },
        confirmButton = {
            TextButton(
                onClick = {
                    val store = Uri.parse("https://play.google.com/store/apps/details?id=${context.packageName}")

                    try {
                        context.startActivity(Intent(Intent.ACTION_VIEW, store))
                    } catch (error: ActivityNotFoundException) {
                        dismissed = true
                    }
                },
            ) { Text("更新する") }
        },
    )
}
