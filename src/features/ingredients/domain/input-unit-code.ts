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
