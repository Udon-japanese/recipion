// 1 桁ずつ別の欄に入れる、ワンタイムコード入力の、挙動の中核（画面に依存しない）。
// 欄の中身は、長さ length の配列（空の欄は ""）。

type OtpDigits = readonly string[];

export function createEmptyDigits(length: number): string[] {
	return Array.from({ length }, () => "");
}

// 全角の数字を半角にして、数字以外を取り除く。
export function extractDigits(raw: string): string {
	return raw.normalize("NFKC").replace(/\D/gu, "");
}

export type DigitsUpdate = {
	digits: string[];
	// 次にフォーカスする欄。
	focusIndex: number;
};

// 入力（1 文字、貼り付け、ブラウザの自動入力）を、startIndex の欄から、順に入れていく。
// 全桁分以上の入力（貼り付けや自動入力）は、どの欄に入っても、先頭の欄から入れる。
export function applyInput(
	digits: OtpDigits,
	startIndex: number,
	raw: string,
): DigitsUpdate {
	const length = digits.length;
	const incoming = extractDigits(raw);

	if (incoming.length === 0) {
		return { digits: [...digits], focusIndex: startIndex };
	}

	const from = incoming.length >= length ? 0 : startIndex;
	const next = [...digits];
	let index = from;

	for (const digit of incoming) {
		if (index >= length) break;

		next[index] = digit;
		index += 1;
	}

	return { digits: next, focusIndex: Math.min(index, length - 1) };
}

// 欄に、すでに数字があるところに、続けて打ったとき、入力欄の値は「元の数字＋新しい数字」になる。
// 新しく打った数字だけを取り出す。
export function stripExistingDigit(current: string, raw: string): string {
	if (current && raw.length > current.length && raw.startsWith(current)) {
		return raw.slice(current.length);
	}

	return raw;
}

// Backspace: 数字がある欄は、その数字を消す。空の欄は、前の欄に戻って、その数字を消す。
export function applyBackspace(digits: OtpDigits, index: number): DigitsUpdate {
	const next = [...digits];

	if (next[index]) {
		next[index] = "";

		return { digits: next, focusIndex: index };
	}

	if (index > 0) {
		next[index - 1] = "";

		return { digits: next, focusIndex: index - 1 };
	}

	return { digits: next, focusIndex: index };
}

export function applyDelete(digits: OtpDigits, index: number): DigitsUpdate {
	const next = [...digits];

	next[index] = "";

	return { digits: next, focusIndex: index };
}

export function isComplete(digits: OtpDigits): boolean {
	return digits.length > 0 && digits.every((digit) => digit !== "");
}

export function joinDigits(digits: OtpDigits): string {
	return digits.join("");
}
