import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	ingredientDictionaryCommandSchema,
	manageIngredientDictionary,
} from "../application/manage-ingredient-dictionary";
import { createDrizzleIngredientDictionaryRepository } from "../infrastructure/drizzle-ingredient-dictionary-repository";

// 自分の食材辞書。端末のキャッシュ（所有者ごと）に入るので、画面が思っているユーザーと違えば断る。
export const listIngredientDictionaryServerFn = createServerFn({
	method: "GET",
})
	.validator((input) =>
		v.parse(v.object({ expectedUserId: expectedUserIdSchema }), input),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		return createDrizzleIngredientDictionaryRepository(db, userId).list();
	});

// 辞書の書き込み（追加・名前の変更・呼び名の追加と削除・削除）。名前で書くので、画面のユーザーも確かめる。
export const manageIngredientDictionaryServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		v.parse(
			v.object({
				expectedUserId: expectedUserIdSchema,
				command: ingredientDictionaryCommandSchema,
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		await manageIngredientDictionary(
			data.command,
			createDrizzleIngredientDictionaryRepository(db, userId),
		);
	});
