package app.recipion.android

import android.app.Application
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.preferencesDataStoreFile
import app.recipion.shared.api.ApiSettings
import app.recipion.shared.api.RecipionApi
import io.ktor.client.engine.okhttp.OkHttp

// 開発用の Turnstile のテストキーは、この固定のトークンで通る。
private const val DEV_CAPTCHA_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"

class RecipionApplication : Application() {
    val api: RecipionApi by lazy {
        val dataStore = PreferenceDataStoreFactory.create { preferencesDataStoreFile("session") }

        RecipionApi(
            engine = OkHttp.create(),
            settings = ApiSettings(
                baseUrl = BuildConfig.API_BASE_URL,
                clientVersion = BuildConfig.VERSION_NAME,
                devOrigin = BuildConfig.API_BASE_URL.takeIf { BuildConfig.DEV_SERVER },
                devCaptchaToken = DEV_CAPTCHA_TOKEN.takeIf { BuildConfig.DEV_SERVER },
            ),
            tokenStore = KeystoreTokenStore(dataStore),
        )
    }
}
