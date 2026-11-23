package app.recipion.shared.api

import kotlin.coroutines.cancellation.CancellationException

internal const val UNEXPECTED_RESPONSE_MESSAGE = "うまくいきませんでした。時間をおいてもう一度お試しください。"

internal const val NETWORK_ERROR_MESSAGE = "通信できませんでした。電波の状態を確かめて、もう一度お試しください。"

// 画面に出す文。中断（CancellationException）は、呼び出し元に伝えるため投げ直す。
internal fun userMessageOf(error: Throwable): String = when (error) {
    is CancellationException -> throw error
    is ApiException -> error.message ?: UNEXPECTED_RESPONSE_MESSAGE
    else -> NETWORK_ERROR_MESSAGE
}
