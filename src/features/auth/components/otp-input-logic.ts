// ワンタイムコード入力の、画面に依存しない部分。
// 欄の中身は、長さ length の配列（空の桁は ""）。

type OtpDigits = readonly string[];

export function createEmptyDigits(length: number): string[] {
	return Array.from({ length }, () => "");
}

// 全角の数字を半角にして、数字以外を取り除く。
export function extractDigits(raw: string): string {
	return raw.normalize("NFKC").replace(/\D/gu, "");
}

// 入力欄の中身（変換中の全角、貼り付け、自動入力など）から、桁の配列を作る。数字だけを取り出し、桁数を超えた分は捨てる。
export function digitsFromRaw(raw: string, length: number): string[] {
	const digits = extractDigits(raw).slice(0, length);

	return Array.from({ length }, (_, index) => digits[index] ?? "");
}

export function isComplete(digits: OtpDigits): boolean {
	return digits.length > 0 && digits.every((digit) => digit !== "");
}

export function joinDigits(digits: OtpDigits): string {
	return digits.join("");
}
