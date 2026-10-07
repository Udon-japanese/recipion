// レシピの入力欄の設定を、この端末に保存する（localStorage。使えない環境では、保存しない）。
const templateKey = "recipion:recipe-editor-template";

function getStorage(): Storage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

// 新規登録で、見出しを最初から入れるか（初期値は、入れる）。
export function readTemplatePreference(): boolean {
	try {
		return getStorage()?.getItem(templateKey) !== "off";
	} catch {
		return true;
	}
}

export function writeTemplatePreference(enabled: boolean): void {
	try {
		getStorage()?.setItem(templateKey, enabled ? "on" : "off");
	} catch {
		// 保存できなくても、入力には影響しない。
	}
}
