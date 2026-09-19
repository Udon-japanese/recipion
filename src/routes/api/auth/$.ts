import { createFileRoute } from "@tanstack/react-router";
import { createDb } from "#/db/client";
import { createAuth } from "@/integrations/better-auth/auth";

async function handler({ request }: { request: Request }) {
	const { db } = await createDb();
	const auth = createAuth(db);

	return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
