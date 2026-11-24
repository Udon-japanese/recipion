package app.recipion.shared.localdb

import androidx.room.ConstructedBy
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.RoomDatabaseConstructor
import androidx.room.Upsert
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.flow.Flow

// 端末の DB。持ち主（ownerScope）は "guest" か "user:<ID>"。
// 買い物メモの行は、6種類とも1つの表に、中身の JSON のまま入れる（サーバーとの同期と同じ形。形を変えても、表を作り直さない）。

@Entity(tableName = "shopping_record", primaryKeys = ["ownerScope", "kind", "id"])
data class ShoppingRecordRow(
    val ownerScope: String,
    val kind: String,
    val id: String,
    val data: String,
)

// 送っていない行の印（どの行か、だけ。送るときに、そのときの行を読む）。
@Entity(tableName = "shopping_outbox", primaryKeys = ["ownerScope", "kind", "id"])
data class ShoppingOutboxRow(
    val ownerScope: String,
    val kind: String,
    val id: String,
    // 書くたびに変わる印。送っている間に、また書かれたら、送り終えても印を外さない。
    val changeId: String,
)

// 行ごとの、知っているサーバーの版と、届いたか分からない変更。
@Entity(tableName = "shopping_version", primaryKeys = ["ownerScope", "kind", "id"])
data class ShoppingVersionRow(
    val ownerScope: String,
    val kind: String,
    val id: String,
    val version: Long,
    // JSON の文字列の配列。
    val unackedChangeIds: String,
)

// 受け取り済みの版。
@Entity(tableName = "shopping_sync_state", primaryKeys = ["ownerScope"])
data class ShoppingSyncStateRow(
    val ownerScope: String,
    val cursor: Long,
)

@Dao
interface ShoppingDao {
    @Query("SELECT * FROM shopping_record WHERE ownerScope = :ownerScope")
    suspend fun records(ownerScope: String): List<ShoppingRecordRow>

    @Query("SELECT * FROM shopping_record WHERE ownerScope = :ownerScope")
    fun watchRecords(ownerScope: String): Flow<List<ShoppingRecordRow>>

    @Query("SELECT * FROM shopping_record WHERE ownerScope = :ownerScope AND kind = :kind AND id = :id")
    suspend fun record(ownerScope: String, kind: String, id: String): ShoppingRecordRow?

    @Upsert
    suspend fun putRecords(rows: List<ShoppingRecordRow>)

    @Query("DELETE FROM shopping_record WHERE ownerScope = :ownerScope AND kind = :kind AND id = :id")
    suspend fun deleteRecord(ownerScope: String, kind: String, id: String)

    @Query("DELETE FROM shopping_record WHERE ownerScope = :ownerScope")
    suspend fun deleteRecords(ownerScope: String)

    @Query("SELECT * FROM shopping_outbox WHERE ownerScope = :ownerScope LIMIT :limit")
    suspend fun outbox(ownerScope: String, limit: Int): List<ShoppingOutboxRow>

    @Query("SELECT * FROM shopping_outbox WHERE ownerScope = :ownerScope")
    suspend fun allOutbox(ownerScope: String): List<ShoppingOutboxRow>

    @Query("SELECT * FROM shopping_outbox WHERE ownerScope = :ownerScope AND kind = :kind AND id = :id")
    suspend fun outboxEntry(ownerScope: String, kind: String, id: String): ShoppingOutboxRow?

    @Query("SELECT COUNT(*) FROM shopping_outbox WHERE ownerScope = :ownerScope")
    fun watchOutboxCount(ownerScope: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM shopping_outbox WHERE ownerScope = :ownerScope")
    suspend fun outboxCount(ownerScope: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putOutbox(rows: List<ShoppingOutboxRow>)

    @Query("DELETE FROM shopping_outbox WHERE ownerScope = :ownerScope AND kind = :kind AND id = :id")
    suspend fun deleteOutboxEntry(ownerScope: String, kind: String, id: String)

    @Query("DELETE FROM shopping_outbox WHERE ownerScope = :ownerScope")
    suspend fun deleteOutbox(ownerScope: String)

    @Query("SELECT * FROM shopping_version WHERE ownerScope = :ownerScope AND kind = :kind AND id = :id")
    suspend fun version(ownerScope: String, kind: String, id: String): ShoppingVersionRow?

    @Upsert
    suspend fun putVersions(rows: List<ShoppingVersionRow>)

    @Query("DELETE FROM shopping_version WHERE ownerScope = :ownerScope")
    suspend fun deleteVersions(ownerScope: String)

    @Query("SELECT cursor FROM shopping_sync_state WHERE ownerScope = :ownerScope")
    suspend fun cursor(ownerScope: String): Long?

    @Upsert
    suspend fun putSyncState(row: ShoppingSyncStateRow)

    @Query("DELETE FROM shopping_sync_state WHERE ownerScope = :ownerScope")
    suspend fun deleteSyncState(ownerScope: String)
}

@Database(
    entities = [ShoppingRecordRow::class, ShoppingOutboxRow::class, ShoppingVersionRow::class, ShoppingSyncStateRow::class],
    version = 1,
)
@ConstructedBy(LocalDatabaseConstructor::class)
abstract class LocalDatabase : RoomDatabase() {
    abstract fun shopping(): ShoppingDao
}

// Room のコンパイラーが、各ターゲットの actual を作る。
@Suppress("KotlinNoActualForExpect")
expect object LocalDatabaseConstructor : RoomDatabaseConstructor<LocalDatabase> {
    override fun initialize(): LocalDatabase
}

fun buildLocalDatabase(builder: RoomDatabase.Builder<LocalDatabase>): LocalDatabase =
    builder
        .setDriver(BundledSQLiteDriver())
        .setQueryCoroutineContext(Dispatchers.IO)
        .build()
