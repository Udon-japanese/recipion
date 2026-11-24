package app.recipion.android

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import app.recipion.shared.api.TokenStore
import kotlinx.coroutines.flow.first
import java.security.GeneralSecurityException
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private const val KEYSTORE = "AndroidKeyStore"
private const val KEY_ALIAS = "session-token"
private const val TRANSFORMATION = "AES/GCM/NoPadding"
private const val IV_SIZE = 12
private const val TAG_BITS = 128

private val tokenKey = stringPreferencesKey("session_token")
private val userIdKey = stringPreferencesKey("session_user_id")

class KeystoreTokenStore(private val dataStore: DataStore<Preferences>) : TokenStore {
    override suspend fun read(): String? {
        val stored = dataStore.data.first()[tokenKey] ?: return null

        return try {
            decrypt(stored)
        } catch (error: GeneralSecurityException) {
            // 鍵が消えた（端末の移行・初期化など）ときは、ログインし直してもらう。
            clear()
            null
        } catch (error: IllegalArgumentException) {
            clear()
            null
        }
    }

    override suspend fun write(token: String) {
        val encrypted = encrypt(token)
        dataStore.edit { it[tokenKey] = encrypted }
    }

    // ID は秘密ではないので、暗号化しない。
    override suspend fun readUserId(): String? = dataStore.data.first()[userIdKey]

    override suspend fun writeUserId(userId: String) {
        dataStore.edit { it[userIdKey] = userId }
    }

    override suspend fun clear() {
        dataStore.edit {
            it.remove(tokenKey)
            it.remove(userIdKey)
        }
    }

    private fun encrypt(text: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())

        return Base64.getEncoder().encodeToString(cipher.iv + cipher.doFinal(text.toByteArray()))
    }

    private fun decrypt(stored: String): String {
        val bytes = Base64.getDecoder().decode(stored)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, bytes, 0, IV_SIZE))

        return cipher.doFinal(bytes, IV_SIZE, bytes.size - IV_SIZE).decodeToString()
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        val existing = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry

        return existing?.secretKey ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE).run {
            init(
                KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build(),
            )
            generateKey()
        }
    }
}
