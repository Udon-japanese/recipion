import * as v from "valibot";

// 画面に出す、エラーの文。入力の検証エラー（Valibot）は、その文を、それ以外は、共通の文を返す。
export function getShoppingErrorMessage(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	return "処理に失敗しました。もう一度お試しください";
}
