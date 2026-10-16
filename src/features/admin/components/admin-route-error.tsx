import type { ErrorComponentProps } from "@tanstack/react-router";
import { RouteError } from "#/errors/route-error";

// 管理者の画面のデータの取得に失敗したとき。管理者でない人は、入口（/admin の共通部分）で、ここまで来ない。
export function AdminRouteError(props: ErrorComponentProps) {
	return <RouteError {...props} subject="管理者の画面" />;
}
