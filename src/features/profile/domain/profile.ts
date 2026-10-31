// 公開される名前（表示名）とハンドルの規則（純粋な関数）。

// 新規ユーザーの、最初の表示名（メールアドレスの一部は、使わない）。
export const defaultDisplayName = "れしぴょなー";

export const displayNameMaxLength = 30;
export const handleMinLength = 3;
export const handleMaxLength = 20;

// ハンドルに使えない名前（機能の名前、運営と紛らわしい名前）。
const reservedHandles: ReadonlySet<string> = new Set([
	"admin",
	"administrator",
	"api",
	"help",
	"inventory",
	"login",
	"logout",
	"me",
	"mod",
	"moderator",
	"null",
	"official",
	"owner",
	"privacy",
	"profile",
	"recipes",
	"recipion",
	"report",
	"root",
	"settings",
	"shopping",
	"signup",
	"staff",
	"support",
	"system",
	"terms",
	"undefined",
	"www",
]);

export type DisplayNameError =
	| "empty"
	| "too-long"
	| "contains-at"
	| "control-characters";

export type HandleError =
	| "too-short"
	| "too-long"
	| "invalid-characters"
	| "reserved";

// 表示名を整える（前後の空白を除く）。
export function normalizeDisplayName(input: string): string {
	return input.trim();
}

// 整えた表示名の問題（なければ null）。メールアドレスを、うっかり入れないよう、@ は使えない。
export function validateDisplayName(name: string): DisplayNameError | null {
	if (name === "") {
		return "empty";
	}

	if (/\p{Cc}/u.test(name)) {
		return "control-characters";
	}

	if (/[@＠]/u.test(name)) {
		return "contains-at";
	}

	return [...name].length > displayNameMaxLength ? "too-long" : null;
}

// ハンドルを整える（全角・半角、大文字・小文字をそろえ、先頭の @ を除く）。
export function normalizeHandle(input: string): string {
	return input.normalize("NFKC").trim().replace(/^@/u, "").toLowerCase();
}

// 整えたハンドルの問題（なければ null）。
export function validateHandle(handle: string): HandleError | null {
	if (!/^[a-z0-9_-]*$/u.test(handle)) {
		return "invalid-characters";
	}

	if (handle.length < handleMinLength) {
		return "too-short";
	}

	if (handle.length > handleMaxLength) {
		return "too-long";
	}

	return reservedHandles.has(handle) ? "reserved" : null;
}

const handleAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const generatedHandleLength = 8;

// 新規ユーザーの、自動のハンドル（user-xxxxxxxx）。乱数は、引数で渡す（0 以上 size 未満の整数を返す関数）。
export function generateHandle(randomIndex: (size: number) => number): string {
	const letters = Array.from(
		{ length: generatedHandleLength },
		() => handleAlphabet[randomIndex(handleAlphabet.length)],
	);

	return `user-${letters.join("")}`;
}

const displayNameMessages: Record<DisplayNameError, string> = {
	empty: "表示名を入力してください。",
	"too-long": `表示名は${displayNameMaxLength}文字以内にしてください。`,
	"contains-at":
		"表示名に @ は使えません（メールアドレスを入れないためです）。",
	"control-characters": "表示名に使えない文字が含まれています。",
};

const handleMessages: Record<HandleError, string> = {
	"too-short": `ハンドルは${handleMinLength}文字以上にしてください。`,
	"too-long": `ハンドルは${handleMaxLength}文字以内にしてください。`,
	"invalid-characters":
		"ハンドルには、半角の英小文字・数字・_（アンダーバー）・-（ハイフン）だけが使えます。",
	reserved: "このハンドルは使えません。別のものにしてください。",
};

export function getDisplayNameErrorMessage(error: DisplayNameError): string {
	return displayNameMessages[error];
}

export function getHandleErrorMessage(error: HandleError): string {
	return handleMessages[error];
}
