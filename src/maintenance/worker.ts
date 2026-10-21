import { createMaintenanceResponse } from "./maintenance";

// メンテ中に、アプリの Worker の代わりにデプロイする Worker（maintenance/wrangler.jsonc）。
export default {
	fetch: () => createMaintenanceResponse(),
} satisfies ExportedHandler;
