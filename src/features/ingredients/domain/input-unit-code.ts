const unitCodes: Record<string, string> = {
	個: "count",
	g: "g",
	kg: "kg",
	ml: "ml",
	l: "l",
};

// 買った単位の呼び名から、換算の inputUnitCode を作る。個数の総称と重さ・体積はコード、それ以外は呼び名のまま（袋・パック・本など）。
export function toInputUnitCode(unit: string): string {
	return unitCodes[unit.toLocaleLowerCase("ja-JP")] ?? unit;
}

// 移行のため（2026-11-27）：以前のカタログのプリセットは、inputUnitCode に英語のコードを入れていた。
// 呼び名が分からないときの読み替え（房・ボトルなど、元の呼び名は分からないので、いちばん多い呼び名にする）。
// 消す条件は docs/todo.md（サーバーの読み替えと、端末の upgrade で、消す時期が違う）。
export const legacyPresetUnitLabels: Readonly<Record<string, string>> = {
	pack: "パック",
	bag: "袋",
	bottle: "ボトル",
	box: "箱",
	can: "缶",
};

// 移行のため（2026-11-28）：買い物メモの項目・換算の記憶の、単位名と inputUnitCode に残る英語のコードを直す。直すものがなければ null。
// 単位名も英語のことがある（在庫の画面で、「pack」で保存されたロットの換算を覚えた記憶）。
// 単位名があれば、それから inputUnitCode を作り直す（房・ボトルも正確に直る）。なければ、対応表で。
// local-db/database.ts の version 9 の upgrade で使う。消す条件は docs/todo.md。
export function fixLegacyUnit(unit: {
	unitLabel: string | null;
	inputUnitCode: string | null;
}): { unitLabel: string | null; inputUnitCode: string | null } | null {
	const label = unit.unitLabel?.trim() || null;
	const legacyLabel =
		label === null ? undefined : legacyPresetUnitLabels[label];
	const legacyCode =
		unit.inputUnitCode === null
			? undefined
			: legacyPresetUnitLabels[unit.inputUnitCode];

	if (legacyLabel === undefined && legacyCode === undefined) {
		return null;
	}

	const unitLabel = legacyLabel ?? label;

	return {
		unitLabel,
		inputUnitCode:
			unit.inputUnitCode === null
				? null
				: unitLabel === null
					? (legacyCode ?? unit.inputUnitCode)
					: toInputUnitCode(unitLabel),
	};
}
