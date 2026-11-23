package app.recipion.android

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.recipion.shared.api.Profile

@Composable
fun HomeScreen(profile: Profile, onSignOut: () -> Unit) {
    Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("${profile.name} さん", style = MaterialTheme.typography.headlineSmall)
        Text("@${profile.handle}", style = MaterialTheme.typography.bodyMedium)
        OutlinedButton(onClick = onSignOut) { Text("ログアウト") }
    }
}
