package app.recipion.shared.attestation

import app.recipion.shared.config.SEND_CODE_REQUEST_HASH_CASES_JSON
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals

@Serializable
private data class HashCase(val email: String, val expected: String)

class SendCodeRequestHashTest {
    @Test
    fun matchesServer() {
        for (case in Json.decodeFromString<List<HashCase>>(SEND_CODE_REQUEST_HASH_CASES_JSON)) {
            assertEquals(case.expected, sendCodeRequestHash(case.email), case.email)
        }
    }
}
