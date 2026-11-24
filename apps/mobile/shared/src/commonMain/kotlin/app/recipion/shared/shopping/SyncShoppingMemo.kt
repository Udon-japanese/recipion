package app.recipion.shared.shopping

// サーバーの側（/api/v1/shopping/sync）。
interface ShoppingSyncRemote {
    // 結果は、送った順。
    suspend fun push(ownerScope: OwnerScope.User, records: List<ShoppingPushRecord>): List<ShoppingPushResult>

    suspend fun pull(ownerScope: OwnerScope.User, after: Long): ShoppingSyncPage
}

data class SyncShoppingMemoResult(val pushedCount: Int, val pulledCount: Int)

// 送り続けても印が減らない（書き続けている）ときに、止める回数。
private const val MAX_PUSH_ROUNDS = 20

private suspend fun pullAll(
    ownerScope: OwnerScope.User,
    after: Long,
    remote: ShoppingSyncRemote,
    onPage: suspend (ShoppingSyncPage) -> Unit,
): Int {
    var cursor = after
    var count = 0

    while (true) {
        val page = remote.pull(ownerScope, cursor)

        page.records.forEach { it.validate() }
        onPage(page)
        count += page.records.size
        cursor = page.cursor

        if (!page.hasMore) return count
    }
}

// 買い物メモを、サーバーと1回同期する（送る → 受け取る）。Web の sync-shopping-memo.ts と同じ手順。
// - この端末で初めてなら、先にサーバーのメモをすべて受け取り、端末のメモを合わせて足す。
// - 同じ行を2台で変えたら、先にサーバーに届いた方が勝つ（行ごと。あとから届いた方は、知らない変更の上に当てない）。
// - 返事を受け取れずに送り直した変更は、二重に当てない。
// - まだ送っていない行は、受け取った中身で上書きしない（送ったときに、サーバーが比べる）。
suspend fun syncShoppingMemo(
    ownerScope: OwnerScope.User,
    local: ShoppingMemoStore,
    remote: ShoppingSyncRemote,
): SyncShoppingMemoResult {
    var pulledCount = 0
    var cursor = local.readCursor(ownerScope)

    if (cursor == null) {
        val records = mutableListOf<VersionedShoppingRecord>()
        var lastCursor = 0L

        pulledCount += pullAll(ownerScope, 0, remote) { page ->
            records += page.records
            lastCursor = page.cursor
        }
        local.mergeFirst(ownerScope, records, lastCursor)
        cursor = lastCursor
    }

    var pushedCount = 0

    for (round in 0 until MAX_PUSH_ROUNDS) {
        val pending = local.readPending(ownerScope, ShoppingSyncLimits.MAX_PUSH_RECORDS)

        if (pending.records.isEmpty()) break

        local.markSent(ownerScope, pending.entries)
        val results = remote.push(ownerScope, pending.records)

        check(results.size == pending.records.size) { "同期の結果の数が合いません" }
        local.acknowledge(ownerScope, pending.entries, results)
        pushedCount += pending.records.size

        if (pending.records.size < ShoppingSyncLimits.MAX_PUSH_RECORDS) break
    }

    pulledCount += pullAll(ownerScope, cursor, remote) { page ->
        local.applyPulled(ownerScope, page.records, page.cursor)
    }

    return SyncShoppingMemoResult(pushedCount, pulledCount)
}
