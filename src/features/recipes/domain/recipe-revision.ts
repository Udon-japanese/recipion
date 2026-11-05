// レシピの版（最後に保存した日時。ISO 8601）。編集を開いたときの版と、保存するときの版が違えば、
// ほかの画面（別のタブ・別の端末）で、先に保存されている。黙って上書きしない（マージはしない）。

// 先に保存されていたときのエラーの文。画面は、これを見て、上書きするかを聞く。
export const RECIPE_CHANGED_ELSEWHERE_MESSAGE =
	"ほかの画面で、このレシピが保存されています";

export function isRecipeChangedElsewhereError(error: unknown): boolean {
	return (
		error instanceof Error && error.message === RECIPE_CHANGED_ELSEWHERE_MESSAGE
	);
}

export function toRecipeRevision(updatedAt: Date): string {
	return updatedAt.toISOString();
}
