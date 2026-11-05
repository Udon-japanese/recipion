// 量を変えたときの、材料ごとの増減のしかた（重み）。
// 分量 ×（1 ＋ 重み ×（割合 − 1））。重み 1 は量に合わせて増減、0 は量を変えても同じ。

export const scaleWeightOptions = [
	{ weight: 1, label: "通常" },
	{ weight: 0.8, label: "やや控えめ" },
	{ weight: 0.5, label: "半分だけ" },
	{ weight: 0, label: "固定" },
] as const;

export type ScaleWeight = (typeof scaleWeightOptions)[number]["weight"];

export const defaultScaleWeight: ScaleWeight = 1;

export const scaleWeightValues: readonly number[] = scaleWeightOptions.map(
	(option) => option.weight,
);

// 重みを掛けた割合（重みがなければ、通常）。
export function weightedRatio(ratio: number, weight = 1): number {
	return 1 + weight * (ratio - 1);
}

// 重みの名前（通常は、印を出さないので null）。
export function scaleWeightLabel(weight = 1): string | null {
	if (weight === 1) {
		return null;
	}

	return (
		scaleWeightOptions.find((option) => option.weight === weight)?.label ?? null
	);
}
