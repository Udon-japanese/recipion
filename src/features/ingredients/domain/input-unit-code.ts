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

// 移行のため（2026-11-28）：英語のコードを、呼び名から作り直す（呼び名がなければ、対応表で）。英語のコードでなければ、そのまま。
// 端末の買い物メモの項目・換算の記憶を直す upgrade（local-db/database.ts の version 8）で使う。
export function fixLegacyInputUnitCode(
	inputUnitCode: string,
	unitLabel: string | null,
): string {
	const legacyLabel = legacyPresetUnitLabels[inputUnitCode];

	if (legacyLabel === undefined) {
		return inputUnitCode;
	}

	const label = unitLabel?.trim();

	return label ? toInputUnitCode(label) : legacyLabel;
}
