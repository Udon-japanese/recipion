import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { dishPlacementsSchema } from "#/features/dish-art/domain/dish-cover";
import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";
import { findRecipeLimitViolation } from "./recipe-limits";
import { isValidLinkLabel, maxLinksPerRecipe } from "./recipe-links";
import { publicRecipeTags, sortPublicRecipeTags } from "./recipe-tags";
import { maxRecipeYieldLength } from "./recipe-yield";
import { scaleWeightOptions } from "./scale-weight";

const requiredText = v.pipe(v.string(), v.trim(), v.minLength(1));
const idSchema = requiredText;
// 量を変えたときの増減のしかた（選択肢の値だけ。省略は通常）。
const scaleWeightSchema = v.optional(
	v.picklist(scaleWeightOptions.map((option) => option.weight)),
);

const ingredientSchema: v.GenericSchema<RecipeEditorIngredientNode> = v.lazy(
	() =>
		v.union([
			v.object({
				type: v.literal("ingredient"),
				status: v.literal("parsed"),
				id: idSchema,
				rawText: requiredText,
				name: requiredText,
				amountText: requiredText,
				quantity: v.nullable(v.pipe(v.number(), v.finite(), v.gtValue(0))),
				unitLabel: v.nullable(requiredText),
				scaleWeight: scaleWeightSchema,
			}),
			v.object({
				type: v.literal("ingredient"),
				status: v.literal("missing-amount"),
				id: idSchema,
				rawText: requiredText,
				name: requiredText,
				amountText: v.null(),
				quantity: v.null(),
				unitLabel: v.null(),
				scaleWeight: scaleWeightSchema,
			}),
			v.object({
				type: v.literal("group"),
				id: idSchema,
				name: requiredText,
				rawText: requiredText,
				inferred: v.boolean(),
				// 構造の安全弁（巨大な入力の処理を避ける）。ふつうの上限と、具体的な文は、recipe-limits.ts。
				children: v.pipe(v.array(ingredientSchema), v.maxLength(500)),
			}),
		]),
);
// レシピの文書の形（API の契約にも出る）。具体的な上限と、形では書けない規則は、validateRecipeEditorDocument。
export const recipeEditorDocumentSchema = v.object({
	name: requiredText,
	yieldText: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "できあがりの量を入れてください"),
		v.maxLength(maxRecipeYieldLength),
	),
	ingredients: v.pipe(v.array(ingredientSchema), v.maxLength(500)),
	preparations: v.pipe(
		v.array(v.object({ id: idSchema, text: requiredText })),
		v.maxLength(200),
	),
	instructions: v.pipe(
		v.array(
			v.object({
				id: idSchema,
				text: requiredText,
				referencedInstructionIds: v.array(idSchema),
			}),
		),
		v.maxLength(200),
	),
	note: v.string(),
	// javascript: などを href に出さないよう、http(s) の URL だけを受け付ける。
	sourceUrl: v.nullable(
		v.pipe(v.string(), v.maxLength(2048), v.url(), v.regex(/^https?:\/\//iu)),
	),
	// 古い画面（visibility を送らない）からの保存は、private として扱う。
	visibility: v.optional(
		v.picklist(["private", "unlisted", "public"]),
		"private",
	),
	stocksWhenMade: v.optional(v.boolean(), false),
	scalable: v.optional(v.boolean(), true),
	cover: v.optional(v.nullable(dishPlacementsSchema), null),
	// 個数・長さの上限と、具体的な文は、recipe-limits.ts。ここは構造の安全弁。
	publicTags: v.optional(
		v.pipe(v.array(v.picklist(publicRecipeTags)), v.maxLength(50)),
		[],
	),
	personalTags: v.optional(v.pipe(v.array(requiredText), v.maxLength(50)), []),
	// 古い画面（links を送らない）からの保存も受け付ける。
	links: v.optional(
		v.pipe(
			v.array(
				v.object({
					label: v.pipe(v.string(), v.check(isValidLinkLabel)),
					targetPublicId: v.pipe(requiredText, v.maxLength(100)),
				}),
			),
			v.maxLength(maxLinksPerRecipe),
		),
		[],
	),
});

function validateIngredientIds(
	nodes: readonly RecipeEditorIngredientNode[],
	ids: Set<string>,
): void {
	for (const node of nodes) {
		if (ids.has(node.id)) {
			throw new UserFacingError("レシピ内でIDが重複しています", {
				code: "INVALID_INPUT",
			});
		}
		ids.add(node.id);

		if (node.type === "group") {
			if (node.children.length === 0) {
				throw new UserFacingError("空の材料グループは保存できません", {
					code: "INVALID_INPUT",
				});
			}
			validateIngredientIds(node.children, ids);
		}
	}
}

// レシピの形が合わないときの文（API の入力の確認でも使う）。
export const INVALID_RECIPE_DOCUMENT_MESSAGE =
	"レシピの入力内容を確認してください";

export function validateRecipeEditorDocument(
	input: unknown,
): RecipeEditorDocument {
	const result = v.safeParse(recipeEditorDocumentSchema, input);

	if (!result.success) {
		throw new UserFacingError(INVALID_RECIPE_DOCUMENT_MESSAGE, {
			code: "INVALID_INPUT",
		});
	}

	// 再帰的な材料スキーマは GenericSchema として宣言しているため、
	// ここで検証済みの出力をドメイン型として扱う。
	const document = result.output;
	const ids = new Set<string>();

	validateIngredientIds(document.ingredients, ids);

	// 入力の上限（具体的な文を返す）。画面でも、保存の前に、同じ関数で確かめている。
	const limitViolation = findRecipeLimitViolation(document);

	if (limitViolation) {
		throw new UserFacingError(limitViolation, { code: "INVALID_INPUT" });
	}

	// 引用元のあるレシピは、公開できない（他のサイトの転載を避ける。DB の制約と同じ）。
	if (document.visibility !== "private" && document.sourceUrl !== null) {
		throw new UserFacingError("引用元のURLがあるレシピは公開できません", {
			code: "INVALID_INPUT",
		});
	}

	if (new Set(document.publicTags).size !== document.publicTags.length) {
		throw new UserFacingError("公開用のタグが重複しています", {
			code: "INVALID_INPUT",
		});
	}

	if (new Set(document.personalTags).size !== document.personalTags.length) {
		throw new UserFacingError("個人用のタグが重複しています", {
			code: "INVALID_INPUT",
		});
	}

	const linkLabels = new Set<string>();

	for (const link of document.links) {
		if (linkLabels.has(link.label)) {
			throw new UserFacingError("リンクのラベルが重複しています", {
				code: "INVALID_INPUT",
			});
		}
		linkLabels.add(link.label);
	}

	for (const preparation of document.preparations) {
		if (ids.has(preparation.id)) {
			throw new UserFacingError("レシピ内でIDが重複しています", {
				code: "INVALID_INPUT",
			});
		}
		ids.add(preparation.id);
	}

	const precedingInstructionIds = new Set<string>();

	for (const instruction of document.instructions) {
		if (ids.has(instruction.id)) {
			throw new UserFacingError("レシピ内でIDが重複しています", {
				code: "INVALID_INPUT",
			});
		}
		ids.add(instruction.id);

		const references = new Set<string>();

		for (const referenceId of instruction.referencedInstructionIds) {
			if (!precedingInstructionIds.has(referenceId)) {
				throw new UserFacingError("前の工程だけを参照してください", {
					code: "INVALID_INPUT",
				});
			}
			if (references.has(referenceId)) {
				throw new UserFacingError("同じ工程への参照が重複しています", {
					code: "INVALID_INPUT",
				});
			}
			references.add(referenceId);
		}

		precedingInstructionIds.add(instruction.id);
	}

	return {
		...document,
		publicTags: sortPublicRecipeTags(document.publicTags),
	};
}
