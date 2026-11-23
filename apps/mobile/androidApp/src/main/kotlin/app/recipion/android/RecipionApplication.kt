package app.recipion.android

import android.app.Application
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.preferencesDataStoreFile
import app.recipion.shared.api.ApiSettings
import app.recipion.shared.api.RecipionApi
import io.ktor.client.engine.okhttp.OkHttp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class RecipionApplication : Application() {
    // Cloud のプロジェクト番号がないビルドでは、証明を取らない（サーバーは証明なしの枠で受ける）。
    private val attestation: PlayIntegrityAttestation? by lazy {
        BuildConfig.PLAY_CLOUD_PROJECT_NUMBER.takeIf { it != 0L }?.let { PlayIntegrityAttestation(this, it) }
    }

    val api: RecipionApi by lazy {
        val dataStore = PreferenceDataStoreFactory.create { preferencesDataStoreFile("session") }

        RecipionApi(
            engine = OkHttp.create(),
            settings = ApiSettings(
                baseUrl = BuildConfig.API_BASE_URL,
                clientVersion = BuildConfig.VERSION_NAME,
                devOrigin = BuildConfig.API_BASE_URL.takeIf { BuildConfig.DEV_SERVER },
            ),
            tokenStore = KeystoreTokenStore(dataStore),
            attestation = { hash -> attestation?.token(hash) },
        )
    }

    override fun onCreate() {
        super.onCreate()

        attestation?.let { attestation ->
            MainScope().launch {
                try {
                    attestation.prepare()
                } catch (error: CancellationException) {
                    throw error
                } catch (_: Exception) {
                    // 送信のときに、もう一度準備を試す。
                }
            }
        }
    }
}
