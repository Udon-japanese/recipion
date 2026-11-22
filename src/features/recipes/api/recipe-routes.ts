import { type Context, Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import { prepareRecipeForStorage } from "../application/prepare-recipe-for-storage";
import { recipeSnapshotSchema } from "../domain/recipe-snapshot";
import { maxRecipeYieldLength } from "../domain/recipe-yield";
import {
	INVALID_RECIPE_DOCUMENT_MESSAGE,
	recipeEditorDocumentSchema,
	validateRecipeEditorDocument,
} from "../domain/validate-recipe-editor-document";
import type { RecipeOperations } from "./recipe-operations";

export type RecipeRouteDependencies = {
	resolveSession: ResolveSession;
	createOperations: (session: ResolvedSession) => RecipeOperations;
};

const publicIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(100));

const publicIdQuerySchema = v.object({ publicId: publicIdSchema });

// 形のあと、上限と形では書けない規則（ID の重複・引用元のあるレシピは公開できない、など）を確かめ、保存の形にする。
function toStorage(document: unknown) {
	return prepareRecipeForStorage(validateRecipeEditorDocument(document));
}

const updateRecipeInputSchema = v.object({
	publicId: publicIdSchema,
	document: recipeEditorDocumentSchema,
	// 編集を開いたときの版。null は、ほかの画面で保存されていても上書きする（本人が選んだとき）。
	expectedRevision: v.nullable(v.pipe(v.string(), v.maxLength(40))),
	// 親の変更を取り込んで保存するとき、取り込んだ親の中身。
	parentSnapshot: v.optional(recipeSnapshotSchema),
});

const forkRecipeInputSchema = v.object({
	parentPublicId: publicIdSchema,
	document: recipeEditorDocumentSchema,
});

const unlockInputSchema = v.object({
	publicId: publicIdSchema,
	passphrase: v.pipe(v.string(), v.maxLength(200)),
});

// 前もって取るリンク先の数の上限（画面の maxPreloadedLinkTargets）と同じ。
const linkedInputSchema = v.object({
	publicIds: v.pipe(
		v.array(v.pipe(v.string(), v.maxLength(100))),
		v.maxLength(30),
	),
});

const linkableUsersQuerySchema = v.object({
	query: v.pipe(v.string(), v.maxLength(100)),
});

const userRecipesQuerySchema = v.object({
	handle: v.pipe(v.string(), v.minLength(1), v.maxLength(40)),
});

const dismissParentChangesInputSchema = v.object({
	publicId: publicIdSchema,
	parentSnapshot: recipeSnapshotSchema,
});

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

const recordCookInputSchema = v.intersect([
	cookInputSchema,
	v.object({
		// つくった量（自分だけが見る記録。人数を変えたときは、変えたあとの量）。
		yieldText: v.pipe(
			v.string(),
			v.trim(),
			v.minLength(1),
			v.maxLength(maxRecipeYieldLength + 10),
		),
	}),
]);

// レシピの API（/api/v1/recipes）。
export function createRecipeRoutes(dependencies: RecipeRouteDependencies) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveSession(c.req.raw.headers),
		);
	}

	return (
		new Hono()
			.get("/", async (c) => c.json(await (await operationsFor(c)).list(), 200))
			.post(
				"/",
				validate(
					"json",
					recipeEditorDocumentSchema,
					INVALID_RECIPE_DOCUMENT_MESSAGE,
				),
				async (c) => {
					const recipe = toStorage(c.req.valid("json"));

					return c.json(await (await operationsFor(c)).create(recipe), 200);
				},
			)
			.get("/viewable", validate("query", publicIdQuerySchema), async (c) => {
				const { publicId } = c.req.valid("query");

				return c.json(
					await (await operationsFor(c)).getViewable(publicId),
					200,
				);
			})
			.get("/own", validate("query", publicIdQuerySchema), async (c) => {
				const { publicId } = c.req.valid("query");

				return c.json(await (await operationsFor(c)).getOwn(publicId), 200);
			})
			// レシピの画面に出す分（中身・作者・日付・もとにしたレシピ）。
			.get("/view", validate("query", publicIdQuerySchema), async (c) => {
				const { publicId } = c.req.valid("query");

				return c.json(await (await operationsFor(c)).view(publicId), 200);
			})
			.post("/unlock", validate("json", unlockInputSchema), async (c) =>
				c.json(
					{
						result: await (await operationsFor(c)).unlock(c.req.valid("json")),
					},
					200,
				),
			)
			.get("/passphrase", validate("query", publicIdQuerySchema), async (c) => {
				const { publicId } = c.req.valid("query");

				return c.json(
					{
						passphrase: await (await operationsFor(c)).getPassphrase(publicId),
					},
					200,
				);
			})
			.post(
				"/passphrase/regenerate",
				validate("json", publicIdQuerySchema),
				async (c) => {
					const { publicId } = c.req.valid("json");

					return c.json(
						{
							passphrase: await (await operationsFor(c)).regeneratePassphrase(
								publicId,
							),
						},
						200,
					);
				},
			)
			// 読むだけだが、ID が最大 30 個で URL が長くなるため、POST で受ける。
			.post("/linked", validate("json", linkedInputSchema), async (c) =>
				c.json(
					await (await operationsFor(c)).linked(c.req.valid("json").publicIds),
					200,
				),
			)
			.get(
				"/linkable-users",
				validate("query", linkableUsersQuerySchema),
				async (c) => {
					const { query } = c.req.valid("query");

					return c.json(
						await (await operationsFor(c)).searchLinkableUsers(query),
						200,
					);
				},
			)
			.get(
				"/linkable-users/recipes",
				validate("query", userRecipesQuerySchema),
				async (c) => {
					const { handle } = c.req.valid("query");

					return c.json(
						await (await operationsFor(c)).listUserPublicRecipes(handle),
						200,
					);
				},
			)
			.get(
				"/parent-merge",
				validate("query", publicIdQuerySchema),
				async (c) => {
					const { publicId } = c.req.valid("query");

					return c.json(
						await (await operationsFor(c)).parentMergeSource(publicId),
						200,
					);
				},
			)
			.post(
				"/parent-merge/dismiss",
				validate("json", dismissParentChangesInputSchema),
				async (c) =>
					c.json(
						await (await operationsFor(c)).dismissParentChanges(
							c.req.valid("json"),
						),
						200,
					),
			)
			.post(
				"/update",
				validate(
					"json",
					updateRecipeInputSchema,
					INVALID_RECIPE_DOCUMENT_MESSAGE,
				),
				async (c) => {
					const { document, ...rest } = c.req.valid("json");
					const recipe = toStorage(document);

					return c.json(
						await (await operationsFor(c)).update({ ...rest, recipe }),
						200,
					);
				},
			)
			.post("/delete", validate("json", publicIdQuerySchema), async (c) => {
				const { publicId } = c.req.valid("json");

				return c.json(await (await operationsFor(c)).delete(publicId), 200);
			})
			.post(
				"/fork",
				validate(
					"json",
					forkRecipeInputSchema,
					INVALID_RECIPE_DOCUMENT_MESSAGE,
				),
				async (c) => {
					const { parentPublicId, document } = c.req.valid("json");
					const recipe = toStorage(document);

					return c.json(
						await (await operationsFor(c)).fork({ parentPublicId, recipe }),
						200,
					);
				},
			)
			// つくった記録（同じ印での再送は、1回だけ）。返すのは、そのレシピの回数と最後の日。
			.post("/cooks", validate("json", recordCookInputSchema), async (c) =>
				c.json(
					await (await operationsFor(c)).recordCook(c.req.valid("json")),
					200,
				),
			)
			// 「元に戻す」で、記録を消す。
			.post("/cooks/cancel", validate("json", cookInputSchema), async (c) =>
				c.json(
					await (await operationsFor(c)).cancelCook(c.req.valid("json")),
					200,
				),
			)
			// レシピの画面に出す、自分がつくった回数と最後の日。
			.get(
				"/cooks/stats",
				validate("query", publicIdQuerySchema),
				async (c) => {
					const { publicId } = c.req.valid("query");

					return c.json(
						await (await operationsFor(c)).cookStats(publicId),
						200,
					);
				},
			)
			// つくったレシピの一覧（新しい順）。
			.get(
				"/cooks",
				validate(
					"query",
					v.object({
						cursor: v.optional(v.pipe(v.string(), v.maxLength(100))),
					}),
				),
				async (c) => {
					const { cursor } = c.req.valid("query");

					return c.json(
						await (await operationsFor(c)).listCooks(cursor ?? null),
						200,
					);
				},
			)
	);
}
