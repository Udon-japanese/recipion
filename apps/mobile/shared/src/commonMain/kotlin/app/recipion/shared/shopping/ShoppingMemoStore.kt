package app.recipion.shared.shopping

import androidx.room.immediateTransaction
import androidx.room.useWriterConnection
import app.recipion.shared.localdb.LocalDatabase
import app.recipion.shared.localdb.ShoppingOutboxRow
import app.recipion.shared.localdb.ShoppingRecordRow
import app.recipion.shared.localdb.ShoppingSyncStateRow
import app.recipion.shared.localdb.ShoppingVersionRow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

// 持ち主："guest"（ログインしていない）か "user:<ID>"。
sealed interface OwnerScope {
    val key: String

    data object Guest : OwnerScope {
        override val key: String = "guest"
    }

    data class User(val userId: String) : OwnerScope {
        override val key: String = "user:$userId"
    }
}

@OptIn(ExperimentalUuidApi::class)
private fun randomChangeId(): String = Uuid.random().toString()

private val changeIdsSerializer = ListSerializer(String.serializer())

private fun ShoppingRecordData.toRow(ownerScope: OwnerScope) =
    ShoppingRecordRow(ownerScope.key, kind.name, recordId, Json.encodeToString(encodeShoppingRecordData(this)))

private fun ShoppingRecordRow.decode(): ShoppingRecordData =
    decodeShoppingRecordData(ShoppingRecordKind.valueOf(kind), id, Json.parseToJsonElement(data).jsonObject)

private fun VersionedShoppingRecord.versionRow(ownerScope: OwnerScope) =
    ShoppingVersionRow(ownerScope.key, kind.name, id, version, "[]")

// 送る印の付いた行と、その印。
data class PendingShoppingRecords(
    val entries: List<ShoppingOutboxRow>,
    val records: List<ShoppingPushRecord>,
)

// 買い物メモの、端末の側の読み書き（Room）。Web の dexie-shopping-sync-store.ts・dexie-guest-shopping-adoption.ts と同じ決まり。
// ログインしている人の行を書くと、送る印を付ける（ゲストの行は、サーバーに送らない）。
class ShoppingMemoStore(
    private val database: LocalDatabase,
    private val createChangeId: () -> String = ::randomChangeId,
) {
    private val dao = database.shopping()

    fun watch(ownerScope: OwnerScope): Flow<ShoppingMemoData> =
        dao.watchRecords(ownerScope.key).map { rows -> shoppingMemoDataOf(rows.map { it.decode() }) }

    fun watchPendingCount(ownerScope: OwnerScope.User): Flow<Int> = dao.watchOutboxCount(ownerScope.key)

    suspend fun read(ownerScope: OwnerScope): ShoppingMemoData =
        shoppingMemoDataOf(dao.records(ownerScope.key).map { it.decode() })

    suspend fun put(ownerScope: OwnerScope, records: List<ShoppingRecordData>) {
        write {
            dao.putRecords(records.map { it.toRow(ownerScope) })
            track(ownerScope, records.map { it.kind to it.recordId })
        }
    }

    suspend fun delete(ownerScope: OwnerScope, kind: ShoppingRecordKind, id: String) {
        write {
            dao.deleteRecord(ownerScope.key, kind.name, id)
            track(ownerScope, listOf(kind to id))
        }
    }

    private suspend fun track(ownerScope: OwnerScope, keys: List<Pair<ShoppingRecordKind, String>>) {
        if (ownerScope !is OwnerScope.User) return

        dao.putOutbox(keys.map { (kind, id) -> ShoppingOutboxRow(ownerScope.key, kind.name, id, createChangeId()) })
    }

    // ゲストのメモを、ログインした人のメモに移す（1つのトランザクション。ゲストの行は消える）。
    suspend fun adoptGuest(ownerScope: OwnerScope.User): ShoppingMemoAdoption =
        write {
            val adoption = planShoppingMemoAdoption(read(OwnerScope.Guest), read(ownerScope))
            val added = adoption.data.records()

            dao.deleteRecords(OwnerScope.Guest.key)
            dao.putRecords(added.map { it.toRow(ownerScope) })
            track(ownerScope, added.map { it.kind to it.recordId })
            adoption
        }

    // ログアウトしたあと、この端末から、その人のメモを消す（ほかの端末のメモには触らない）。
    suspend fun clear(ownerScope: OwnerScope.User) {
        write {
            dao.deleteRecords(ownerScope.key)
            dao.deleteOutbox(ownerScope.key)
            dao.deleteVersions(ownerScope.key)
            dao.deleteSyncState(ownerScope.key)
        }
    }

    // --- サーバーとの同期 ---

    suspend fun readCursor(ownerScope: OwnerScope.User): Long? = dao.cursor(ownerScope.key)

    suspend fun countPending(ownerScope: OwnerScope.User): Int = dao.outboxCount(ownerScope.key)

    // 送る印のある行を、いまの中身と、変えたもとの版つきで読む（行がなければ、消した行）。
    suspend fun readPending(ownerScope: OwnerScope.User, limit: Int): PendingShoppingRecords =
        write {
            val entries = dao.outbox(ownerScope.key, limit)
            val records = entries.map { entry ->
                val row = dao.record(ownerScope.key, entry.kind, entry.id)
                val version = dao.version(ownerScope.key, entry.kind, entry.id)

                ShoppingPushRecord(
                    kind = ShoppingRecordKind.valueOf(entry.kind),
                    id = entry.id,
                    deleted = row == null,
                    data = row?.let { Json.parseToJsonElement(it.data).jsonObject },
                    changeId = entry.changeId,
                    baseVersion = version?.version ?: 0,
                    unackedChangeIds = version?.let { unackedOf(it) } ?: emptyList(),
                )
            }

            PendingShoppingRecords(entries, records)
        }

    // 送る前に、送る変更を覚える（返事を受け取れなくても、届いていたら、次の変更をその上に当てられる）。
    suspend fun markSent(ownerScope: OwnerScope.User, entries: List<ShoppingOutboxRow>) {
        write {
            dao.putVersions(
                entries.map { entry ->
                    val version = dao.version(ownerScope.key, entry.kind, entry.id)

                    ShoppingVersionRow(
                        ownerScope = ownerScope.key,
                        kind = entry.kind,
                        id = entry.id,
                        version = version?.version ?: 0,
                        unackedChangeIds = Json.encodeToString(
                            changeIdsSerializer,
                            ((version?.let { unackedOf(it) } ?: emptyList()) + entry.changeId)
                                .takeLast(ShoppingSyncLimits.MAX_UNACKED_CHANGE_IDS),
                        ),
                    )
                },
            )
        }
    }

    // 送った結果を当てる。
    // - 当たった行：知っている版を進め、印を外す（送っている間に、また書かれた行は、印を残す）。
    // - 別の端末が先に変えていた行：サーバーの行を端末に当て、端末の変更は捨てる（送っている間に、また書かれていたら、次の同期まで待つ）。
    suspend fun acknowledge(
        ownerScope: OwnerScope.User,
        entries: List<ShoppingOutboxRow>,
        results: List<ShoppingPushResult>,
    ) {
        write {
            entries.forEachIndexed { index, entry ->
                val result = results.getOrNull(index) ?: return@forEachIndexed
                val isUnchanged = dao.outboxEntry(ownerScope.key, entry.kind, entry.id)?.changeId == entry.changeId

                if (result is ShoppingPushResult.Conflict && !isUnchanged) return@forEachIndexed

                if (result is ShoppingPushResult.Conflict) {
                    applyRecord(ownerScope, result.current)
                }

                val version = when (result) {
                    is ShoppingPushResult.Applied -> result.version
                    is ShoppingPushResult.Conflict -> result.current.version
                }

                dao.putVersions(listOf(ShoppingVersionRow(ownerScope.key, entry.kind, entry.id, version, "[]")))

                if (isUnchanged) {
                    dao.deleteOutboxEntry(ownerScope.key, entry.kind, entry.id)
                }
            }
        }
    }

    // 受け取った行を当て、知っている版を進める。
    // まだ送っていない行（印がある）は、当てず、版も進めない（送ったときに、サーバーが、先の変更と比べる）。
    suspend fun applyPulled(ownerScope: OwnerScope.User, records: List<VersionedShoppingRecord>, cursor: Long) {
        write {
            val pending = dao.allOutbox(ownerScope.key).map { it.kind to it.id }.toSet()
            val applied = records.filter { (it.kind.name to it.id) !in pending }

            applied.forEach { applyRecord(ownerScope, it) }
            dao.putVersions(applied.map { it.versionRow(ownerScope) })
            dao.putSyncState(ShoppingSyncStateRow(ownerScope.key, cursor))
        }
    }

    // この端末で初めて同期する：サーバーのメモに、端末のメモを合わせて足す（ゲストのメモの引き継ぎと同じ合わせ方）。
    // 足した端末の行だけに、送る印を付ける（サーバーの行は、送り返さない）。
    suspend fun mergeFirst(ownerScope: OwnerScope.User, records: List<VersionedShoppingRecord>, cursor: Long) {
        write {
            val server = shoppingMemoDataOf(records.mapNotNull { it.decodedData() })
            val local = withoutServerIds(read(ownerScope), server)
            val added = planShoppingMemoAdoption(local, server).data.records()

            dao.deleteRecords(ownerScope.key)
            dao.putRecords((server.records() + added).map { it.toRow(ownerScope) })
            dao.deleteOutbox(ownerScope.key)
            dao.deleteVersions(ownerScope.key)
            dao.putOutbox(added.map { ShoppingOutboxRow(ownerScope.key, it.kind.name, it.recordId, createChangeId()) })
            dao.putVersions(records.map { it.versionRow(ownerScope) })
            dao.putSyncState(ShoppingSyncStateRow(ownerScope.key, cursor))
        }
    }

    private suspend fun applyRecord(ownerScope: OwnerScope, record: VersionedShoppingRecord) {
        val data = record.decodedData()

        if (data == null) {
            dao.deleteRecord(ownerScope.key, record.kind.name, record.id)
        } else {
            dao.putRecords(listOf(data.toRow(ownerScope)))
        }
    }

    private fun unackedOf(row: ShoppingVersionRow): List<String> =
        Json.decodeFromString(changeIdsSerializer, row.unackedChangeIds)

    private suspend fun <T> write(block: suspend () -> T): T =
        database.useWriterConnection { transactor -> transactor.immediateTransaction { block() } }
}

// サーバーにすでにある ID の行は、端末の方を足さない（同じ行が2つにならないように。サーバーの方を残す）。
private fun withoutServerIds(local: ShoppingMemoData, server: ShoppingMemoData): ShoppingMemoData {
    val itemIds = server.items.map { it.id }.toSet()
    val storeIds = server.stores.map { it.id }.toSet()
    val branchIds = server.branches.map { it.id }.toSet()

    return local.copy(
        items = local.items.filter { it.id !in itemIds },
        stores = local.stores.filter { it.id !in storeIds },
        branches = local.branches.filter { it.id !in branchIds },
    )
}
