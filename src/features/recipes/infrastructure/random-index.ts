// 0 以上 size 未満の乱数（暗号用の乱数。偏りを避けるため、範囲に収まる値だけを使う）。
export function randomIndex(size: number): number {
	const limit = Math.floor(0x100000000 / size) * size;
	const buffer = new Uint32Array(1);

	for (;;) {
		crypto.getRandomValues(buffer);

		const [value] = buffer;

		if (value !== undefined && value < limit) {
			return value % size;
		}
	}
}
