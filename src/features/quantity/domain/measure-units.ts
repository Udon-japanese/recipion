// 重さ・体積の、対になる単位（基本の単位と、その 1000 倍の単位）。
// 表示の切り替え（1,000g 以上は kg）と、量の欄の切り替え（g ⇄ kg）で、同じ表を使う。

export type MeasureKind = "weight" | "volume";

export const largerMeasureFactor = 1000;

type Measure = {
	// 基本の単位（在庫・保存の単位）。
	base: string;
	// 1000 倍の単位。
	larger: string;
	// 基本の単位として読む書き方（小文字）。cc は ml と同じ量。
	baseAliases: readonly string[];
	largerAliases: readonly string[];
};

const measures: Record<MeasureKind, Measure> = {
	weight: {
		base: "g",
		larger: "kg",
		baseAliases: ["g"],
		largerAliases: ["kg"],
	},
	volume: {
		base: "ml",
		larger: "L",
		baseAliases: ["ml", "cc"],
		largerAliases: ["l"],
	},
};

const measureKinds = Object.keys(measures) as MeasureKind[];

function normalizeUnit(unit: string): string {
	return unit.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
}

type MeasureUnit = { kind: MeasureKind; isLarger: boolean };

/** 単位が、重さ・体積のどちらの、基本か 1000 倍か。ほかの単位なら null。 */
export function findMeasureUnit(
	unit: string | null | undefined,
): MeasureUnit | null {
	if (!unit) {
		return null;
	}

	const normalized = normalizeUnit(unit);

	for (const kind of measureKinds) {
		const measure = measures[kind];

		if (measure.baseAliases.includes(normalized)) {
			return { kind, isLarger: false };
		}

		if (measure.largerAliases.includes(normalized)) {
			return { kind, isLarger: true };
		}
	}

	return null;
}

/** 種類と大きさから、単位の文字（g・kg・ml・L）。 */
export function measureUnitLabel(kind: MeasureKind, isLarger: boolean): string {
	return isLarger ? measures[kind].larger : measures[kind].base;
}

/** 表示で、大きい量に使う単位（g → kg、ml・cc → L）。基本の単位でなければ undefined。 */
export function largerMeasureUnit(
	unit: string | null | undefined,
): string | undefined {
	const found = findMeasureUnit(unit);

	return found && !found.isLarger ? measures[found.kind].larger : undefined;
}

/** 量の欄の単位を押したときの、次の単位（g ⇄ kg、ml・cc → L → ml）。対がなければ null。 */
export function toggleMeasureUnit(
	unit: string | null | undefined,
): string | null {
	const found = findMeasureUnit(unit);

	return found ? measureUnitLabel(found.kind, !found.isLarger) : null;
}

/** 1000 倍の単位を、基本の単位にする（kg → g、L → ml）。ほかの単位は、そのまま。 */
export function toBaseMeasureUnit(unit: string): string {
	const found = findMeasureUnit(unit);

	return found?.isLarger ? measures[found.kind].base : unit;
}

/**
 * 1000 倍の単位で打った量を、基本の単位の量にする（1.5kg → 1500g）。ほかの単位は、そのまま。
 * 割り算の誤差（1.1 × 1000 = 1100.0000000000002）は、小数6桁で丸める。
 */
export function toBaseMeasureAmount(amount: {
	quantity: number;
	unitLabel: string;
}): { quantity: number; unitLabel: string } {
	const found = findMeasureUnit(amount.unitLabel);

	return found?.isLarger
		? {
				quantity: Number((amount.quantity * largerMeasureFactor).toFixed(6)),
				unitLabel: measures[found.kind].base,
			}
		: amount;
}

/**
 * 単位の候補に、g・ml のすぐ後ろへ kg・L を足す（["g", "ml", "個"] → ["g", "kg", "ml", "L", "個"]）。
 * 同じ単位は1つにまとめる（在庫の単位が g の食材の ["g", "ml", "g"] など）。
 */
export function withLargerMeasureUnits(units: readonly string[]): string[] {
	const unique = [...new Set(units)];

	return unique.flatMap((unit) => {
		const larger = largerMeasureUnit(unit);

		return larger && !unique.includes(larger) ? [unit, larger] : [unit];
	});
}
