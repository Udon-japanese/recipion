import type { ErrorComponentProps } from "@tanstack/react-router";

export function ProfileRouteError({ error }: ErrorComponentProps) {
	const message = error instanceof Error ? error.message : "不明なエラー";

	return (
		<p role="alert">
			プロフィールを表示できませんでした：{message}
			（ログインしていない場合は、ログインしてください）
		</p>
	);
}
