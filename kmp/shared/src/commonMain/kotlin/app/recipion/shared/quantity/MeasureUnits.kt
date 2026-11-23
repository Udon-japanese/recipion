package app.recipion.shared.quantity

enum class MeasureKind { Weight, Volume }

const val LARGER_MEASURE_FACTOR = 1000

private class Measure(
    val base: String,
    val larger: String,
    val baseAliases: List<String>,
    val largerAliases: List<String>,
)

private val measures = mapOf(
    MeasureKind.Weight to Measure(base = "g", larger = "kg", baseAliases = listOf("g"), largerAliases = listOf("kg")),
    MeasureKind.Volume to Measure(base = "ml", larger = "L", baseAliases = listOf("ml", "cc"), largerAliases = listOf("l")),
)

private fun normalizeUnit(unit: String): String = normalizeNfkc(unit).trim().lowercase()

data class MeasureUnit(val kind: MeasureKind, val isLarger: Boolean)

fun findMeasureUnit(unit: String?): MeasureUnit? {
    if (unit.isNullOrEmpty()) {
        return null
    }

    val normalized = normalizeUnit(unit)

    for ((kind, measure) in measures) {
        if (normalized in measure.baseAliases) {
            return MeasureUnit(kind, isLarger = false)
        }

        if (normalized in measure.largerAliases) {
            return MeasureUnit(kind, isLarger = true)
        }
    }

    return null
}

fun largerMeasureUnit(unit: String?): String? {
    val found = findMeasureUnit(unit) ?: return null

    return if (found.isLarger) null else measures.getValue(found.kind).larger
}
