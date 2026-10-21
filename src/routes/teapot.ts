import { createFileRoute } from "@tanstack/react-router";
import { createTeapotResponse } from "#/config/teapot-page";

// 418 I'm a teapot。画面（HTML）を、そのまま返すだけのルート（アプリの画面は読み込まない）。
export const Route = createFileRoute("/teapot")({
	server: {
		handlers: {
			GET: () => createTeapotResponse(),
		},
	},
});
