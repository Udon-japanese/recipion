import { eq } from "drizzle-orm";

import type { DB } from "#/db/client";
import { isUniqueViolation } from "#/db/is-unique-violation";
import { user } from "#/integrations/better-auth/auth.sql";
import type { ProfileRepository } from "../application/profile-repository";

// 呼び出すユーザー本人のプロフィールだけを扱う（ほかのユーザーの行は、読み書きできない）。
export function createDrizzleProfileRepository(
	db: DB,
	userId: string,
): ProfileRepository {
	return {
		async get() {
			const [row] = await db
				.select({ name: user.name, handle: user.handle })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			return row ? { name: row.name, handle: row.handle } : null;
		},

		async update({ name, handle }) {
			try {
				const rows = await db
					.update(user)
					.set({ name, handle })
					.where(eq(user.id, userId))
					.returning({ id: user.id });

				return rows.length === 0 ? "not-found" : "updated";
			} catch (error) {
				if (isUniqueViolation(error, "user_handle_unique")) {
					return "handle-taken";
				}

				throw error;
			}
		},
	};
}
