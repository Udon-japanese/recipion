package app.recipion.shared.quantity

internal actual fun normalizeNfkc(text: String): String =
    text.asDynamic().normalize("NFKC").unsafeCast<String>()

internal actual fun toFixedString(value: Double, digits: Int): String =
    value.asDynamic().toFixed(digits).unsafeCast<String>()
