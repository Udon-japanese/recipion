import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import * as schema from "./schema";

export async function createDb() {
	const client = new Client({
		connectionString: env.HYPERDRIVE.connectionString,
	});

	await client.connect();

	return {
		db: drizzle(client, { schema }),
		client,
	};
}

export type DB = Awaited<ReturnType<typeof createDb>>["db"];
