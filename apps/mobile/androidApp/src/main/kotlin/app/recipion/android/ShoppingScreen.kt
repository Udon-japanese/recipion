package app.recipion.android

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.recipion.shared.shopping.ShoppingItem
import app.recipion.shared.shopping.ShoppingItemStatus
import app.recipion.shared.shopping.ShoppingMemoViewModel

@Composable
fun ShoppingScreen(viewModel: ShoppingMemoViewModel, account: @Composable () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // 前面に戻ったときに、ほかの端末の変更を受け取る。
    LifecycleResumeEffect(viewModel) {
        viewModel.sync()
        onPauseOrDispose {}
    }

    Column(modifier = Modifier.fillMaxSize().imePadding()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("買い物メモ", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            account()
        }

        SyncStatus(pendingCount = state.pendingCount, syncFailed = state.syncFailed)

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(state.items, key = { it.id }) { item ->
                ShoppingItemRow(item, onToggle = { viewModel.toggle(item.id) }, onDelete = { viewModel.delete(item.id) })
                HorizontalDivider()
            }
        }

        if (!state.isLoading && state.items.isEmpty()) {
            Text("買うものを足してください", modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium)
        }

        state.errorMessage?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 16.dp))
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = state.draftName,
                onValueChange = viewModel::updateDraft,
                label = { Text("買うもの") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { viewModel.add() }),
                modifier = Modifier.weight(1f),
            )
            Button(onClick = viewModel::add, enabled = state.canAdd) { Text("足す") }
        }
    }

    state.guestAdoptionItemCount?.let { count ->
        AlertDialog(
            onDismissRequest = viewModel::dismissGuestAdoption,
            title = { Text("ログインする前の買い物メモを移しますか") },
            text = {
                Text(
                    if (count > 0) {
                        "ログインする前に書いた買い物メモ（まだ買っていない${count}件と、店・条件つきのメモ）を、このアカウントのメモに移します。同じ名前の店は、1つにまとめます。"
                    } else {
                        "ログインする前に作った店・条件つきのメモを、このアカウントのメモに移します。同じ名前の店は、1つにまとめます。"
                    },
                )
            },
            dismissButton = { TextButton(onClick = viewModel::dismissGuestAdoption) { Text("今回は移さない") } },
            confirmButton = { TextButton(onClick = viewModel::adoptGuest) { Text("移す") } },
        )
    }
}

@Composable
private fun SyncStatus(pendingCount: Int, syncFailed: Boolean) {
    val message = when {
        syncFailed && pendingCount > 0 -> "オフラインのため、${pendingCount}件の変更をまだ送れていません"
        syncFailed -> "サーバーにつながりません。オフラインでも書けます"
        else -> null
    } ?: return

    Text(message, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(horizontal = 16.dp))
}

@Composable
private fun ShoppingItemRow(item: ShoppingItem, onToggle: () -> Unit, onDelete: () -> Unit) {
    val checked = item.status == ShoppingItemStatus.Checked

    Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onToggle).padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = checked, onCheckedChange = { onToggle() })
        Text(
            item.name,
            modifier = Modifier.weight(1f),
            textDecoration = if (checked) TextDecoration.LineThrough else null,
        )
        TextButton(onClick = onDelete) { Text("消す") }
    }
}
