import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createDrizzleRecipeCookLogRepository } from "../infrastructure/drizzle-recipe-cook-log-repository";

const publicIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(100));

// 「つくった」の操作の印は「レシピの公開 ID:UUID」（startRecipeConsumption）。別のレシピの印は受け付けない。
const cookInputSchema = v.pipe(
	v.object({
		recipePublicId: publicIdSchema,
		sourceId: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	}),
	v.check(
		(input) => input.sourceId.startsWith(`${input.recipePublicId}:`),
		"つくった記録の印が、レシピと合いません",
	),
);

// 「つくった！」を記録する（同じ印での再送は、1回だけ）。返すのは、そのレシピの回数と最後の日。
export const recordRecipeCookServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(cookInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleRecipeCookLogRepository(db, userId).record(data);
	});

// 「元に戻す」で、記録を消す。
export const cancelRecipeCookServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(cookInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleRecipeCookLogRepository(db, userId).cancel(data);
	});

// レシピの画面に出す、自分がつくった回数と最後の日。
export const getRecipeCookStatsServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(v.object({ publicId: publicIdSchema }), input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleRecipeCookLogRepository(db, userId).statsFor(
			data.publicId,
		);
	});

// つくったレシピの一覧（新しい順）。
export const listRecipeCooksServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(
			v.object({ cursor: v.optional(v.pipe(v.string(), v.maxLength(100))) }),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleRecipeCookLogRepository(db, userId).list(
			data.cursor ?? null,
		);
	});
