// テストで、換算の記憶の表を組み立てるときの鍵（本物の鍵は ID。中身で見分けるので、鍵の形は問わない）。
export function toConversionMemoryKey(
	nameKey: string,
	unitLabel: string | null,
): string {
	return `${nameKey}\t${unitLabel ?? ""}`;
}
