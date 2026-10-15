import type { ErrorComponentProps } from "@tanstack/react-router";
import { RouteError } from "#/errors/route-error";

export function ProfileRouteError(props: ErrorComponentProps) {
	return <RouteError {...props} subject="プロフィール" />;
}
