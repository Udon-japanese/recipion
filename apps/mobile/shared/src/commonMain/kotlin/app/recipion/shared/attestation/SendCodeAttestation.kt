package app.recipion.shared.attestation

// コードの送信が、本物のアプリからだと示すトークン（Android は Play Integrity）。
// 取れなければ null を返す。サーバーは、証明のない送信も、全体で1つの厳しい上限の中で通す。
fun interface SendCodeAttestation {
    suspend fun token(requestHash: String): String?
}

// サーバー（src/integrations/play-integrity/request-hash.ts）と同じ作り方にする。ずれると、本物のアプリが証明なしになる。
fun sendCodeRequestHash(email: String): String = sha256Hex("send-code:$email")

internal expect fun sha256Hex(text: String): String
