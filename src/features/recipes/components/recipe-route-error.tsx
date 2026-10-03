import type { ErrorComponentProps } from "@tanstack/react-router";

export function RecipeRouteError({ error }: ErrorComponentProps) {
	const message = error instanceof Error ? error.message : "不明なエラー";

	return (
		<p role="alert">
			レシピを表示できませんでした：{message}
			（ログインしていない場合は、ログインしてください）
		</p>
	);
}
