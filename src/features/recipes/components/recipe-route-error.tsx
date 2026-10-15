import type { ErrorComponentProps } from "@tanstack/react-router";
import { RouteError } from "#/errors/route-error";

export function RecipeRouteError(props: ErrorComponentProps) {
	return (
		<RouteError
			{...props}
			subject="レシピ"
			loginMessage="ログインすると、レシピを作成・閲覧できます"
		/>
	);
}
