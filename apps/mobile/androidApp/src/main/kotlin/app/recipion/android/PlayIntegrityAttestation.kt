package app.recipion.android

import android.content.Context
import app.recipion.shared.attestation.SendCodeAttestation
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityException
import com.google.android.play.core.integrity.StandardIntegrityManager.PrepareIntegrityTokenRequest
import com.google.android.play.core.integrity.StandardIntegrityManager.StandardIntegrityTokenProvider
import com.google.android.play.core.integrity.StandardIntegrityManager.StandardIntegrityTokenRequest
import com.google.android.play.core.integrity.model.StandardIntegrityErrorCode
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull

// 準備が終わっていなければ、送信のときに待つ。待ちすぎるとログインが遅れるので、証明なしで送る。
private const val TOKEN_TIMEOUT_MS = 15_000L

class PlayIntegrityAttestation(context: Context, private val cloudProjectNumber: Long) : SendCodeAttestation {
    private val manager = IntegrityManagerFactory.createStandard(context)
    private val mutex = Mutex()
    private var provider: StandardIntegrityTokenProvider? = null

    // 準備には数秒かかるので、起動したときに済ませておく。
    suspend fun prepare() {
        provider()
    }

    override suspend fun token(requestHash: String): String? =
        withTimeoutOrNull(TOKEN_TIMEOUT_MS) {
            try {
                request(requestHash)
            } catch (error: StandardIntegrityException) {
                // 長く使った provider は期限が切れる。準備し直して、1回だけやり直す。
                if (error.errorCode != StandardIntegrityErrorCode.INTEGRITY_TOKEN_PROVIDER_INVALID) throw error

                mutex.withLock { provider = null }
                request(requestHash)
            }
        }

    private suspend fun request(requestHash: String): String =
        provider()
            .request(StandardIntegrityTokenRequest.builder().setRequestHash(requestHash).build())
            .await()
            .token()

    private suspend fun provider(): StandardIntegrityTokenProvider =
        mutex.withLock {
            provider ?: manager
                .prepareIntegrityToken(
                    PrepareIntegrityTokenRequest.builder().setCloudProjectNumber(cloudProjectNumber).build(),
                )
                .await()
                .also { provider = it }
        }
}
