package app.recipion.shared.quantity

internal expect fun normalizeNfkc(text: String): String

// JS の toFixed と同じく、double の正確な値で丸める（1.005 は "1.00"）。
internal expect fun toFixedString(value: Double, digits: Int): String
