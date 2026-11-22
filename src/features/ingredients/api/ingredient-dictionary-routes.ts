import { Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import {
	expectedUserIdSchema,
	withExpectedUserId,
} from "#/integrations/better-auth/expected-user";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import type { IngredientDictionaryRepository } from "../application/ingredient-dictionary-repository";
import {
	ingredientDictionaryCommandSchema,
	manageIngredientDictionary,
} from "../application/manage-ingredient-dictionary";

export type IngredientDictionaryRouteDependencies = {
	resolveSession: ResolveSession;
	createRepository: (
		session: ResolvedSession,
	) => IngredientDictionaryRepository;
};

// 自分の食材辞書の API（/api/v1/ingredients/dictionary）。
// 一覧は、端末のキャッシュ（所有者ごと）に入り、書き込みは名前で行うので、どちらも、画面が思っているユーザーと違えば断る。
export function createIngredientDictionaryRoutes(
	dependencies: IngredientDictionaryRouteDependencies,
) {
	async function repositoryFor(headers: Headers, expectedUserId?: string) {
		return dependencies.createRepository(
			await dependencies.resolveSession(headers, { expectedUserId }),
		);
	}

	return (
		new Hono()
			.get(
				"/",
				validate(
					"query",
					v.object({ expectedUserId: v.optional(expectedUserIdSchema) }),
				),
				async (c) => {
					const repository = await repositoryFor(
						c.req.raw.headers,
						c.req.valid("query").expectedUserId,
					);

					return c.json(await repository.list(), 200);
				},
			)
			// 書き込み（追加・名前の変更・呼び名の追加と削除・削除・統合など）。
			.post(
				"/",
				validate(
					"json",
					withExpectedUserId({ command: ingredientDictionaryCommandSchema }),
				),
				async (c) => {
					const { expectedUserId, command } = c.req.valid("json");

					await manageIngredientDictionary(
						command,
						await repositoryFor(c.req.raw.headers, expectedUserId),
					);

					return c.json({ updated: true as const }, 200);
				},
			)
	);
}
