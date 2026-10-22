import {
	createMaintenanceResponse,
	MAINTENANCE_REASON_VAR_NAME,
} from "./maintenance";

// メンテ中に、アプリの Worker の代わりにデプロイする Worker（maintenance/wrangler.jsonc）。
export default {
	fetch: (_request, env) =>
		createMaintenanceResponse(
			(env as Record<string, unknown>)[MAINTENANCE_REASON_VAR_NAME] as
				| string
				| undefined,
		),
} satisfies ExportedHandler;
