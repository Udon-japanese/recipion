package app.recipion.shared.localdb

import android.content.Context
import androidx.room.Room

fun createLocalDatabase(context: Context): LocalDatabase {
    val appContext = context.applicationContext

    return buildLocalDatabase(
        Room.databaseBuilder<LocalDatabase>(
            context = appContext,
            name = appContext.getDatabasePath("recipion-local.db").absolutePath,
        ),
    )
}
