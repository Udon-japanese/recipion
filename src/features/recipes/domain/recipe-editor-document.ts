import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import type {
	ParsedRecipeIngredientGroup,
	ParsedRecipeIngredientItem,
	ParsedRecipeIngredientNode,
} from "./parse-recipe-ingredients";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";
import { parseRecipeInstructions } from "./parse-recipe-instructions";
import { parseRecipePreparations } from "./parse-recipe-preparations";
import type { RecipeVisibility } from "./recipe-link-permission";
import type { RecipeLinkReference } from "./recipe-links";
import type { PublicRecipeTag } from "./recipe-tags";
import { defaultRecipeYieldText } from "./recipe-yield";

export type RecipeEditorIngredientItem = ParsedRecipeIngredientItem & {
	id: string;
	// 量を変えたときの増減のしかた（scale-weight.ts。省略は通常＝1）。
	scaleWeight?: number;
};

export type RecipeEditorIngredientGroup = Omit<
	ParsedRecipeIngredientGroup,
	"children"
> & {
	id: string;
	children: RecipeEditorIngredientNode[];
};

export type RecipeEditorIngredientNode =
	| RecipeEditorIngredientItem
	| RecipeEditorIngredientGroup;

export type RecipeEditorPreparation = {
	id: string;
	text: string;
};

export type RecipeEditorInstruction = {
	id: string;
	text: string;
	referencedInstructionIds: string[];
};

export type RecipeEditorDocument = {
	name: string;
	// できあがりの量（「4人分」「12個」など）。
	yieldText: string;
	ingredients: RecipeEditorIngredientNode[];
	preparations: RecipeEditorPreparation[];
	instructions: RecipeEditorInstruction[];
	note: string;
	// 引用元の URL。ユーザーが手で入れる任意項目で、未入力は null。
	sourceUrl: string | null;
	// 本文の [[ラベル]] が指すレシピ。本文に出てこないラベルは、保存のときに捨てる。
	links: RecipeLinkReference[];
	// 公開範囲。省略は private（自分だけ）。
	visibility?: RecipeVisibility;
	// 「作った」で、できあがりを在庫に入れる（作り置き）。省略は false。
	stocksWhenMade?: boolean;
	// 量を変えられるか（false は「この分量で作る」。他のレシピからリンクされても、いつも1回分）。省略は true。
	scalable?: boolean;
	// 料理の絵。省略か null は、レシピ名から選ぶプリセット。
	cover?: DishPlacement[] | null;
	// 公開用のタグ（語の一覧の順）。省略は空。
	publicTags?: PublicRecipeTag[];
	// 個人用のタグ（本人にしか見えない）。省略は空。
	personalTags?: string[];
};

export type CreateRecipeEditorDocumentInput = {
	name?: string;
	yieldText?: string;
	ingredientText?: string;
	preparationText?: string;
	instructionText?: string;
	note?: string;
	sourceUrl?: string;
	links?: RecipeLinkReference[];
	visibility?: RecipeVisibility;
	stocksWhenMade?: boolean;
	scalable?: boolean;
	cover?: DishPlacement[] | null;
	publicTags?: PublicRecipeTag[];
	personalTags?: string[];
};

type CreateId = () => string;

function createIngredientNode(
	node: ParsedRecipeIngredientNode,
	createId: CreateId,
): RecipeEditorIngredientNode {
	if (node.type === "ingredient") {
		return {
			...node,
			id: createId(),
		};
	}

	return {
		...node,
		id: createId(),
		children: node.children.map((child) =>
			createIngredientNode(child, createId),
		),
	};
}

export function createRecipeEditorDocument(
	input: CreateRecipeEditorDocumentInput = {},
	createId: CreateId = () => crypto.randomUUID(),
): RecipeEditorDocument {
	const parsedIngredients = parseRecipeIngredients(input.ingredientText ?? "");

	return {
		name: input.name?.trim() ?? "",
		yieldText: input.yieldText?.trim() || defaultRecipeYieldText,
		ingredients: parsedIngredients.map((node) =>
			createIngredientNode(node, createId),
		),
		preparations: parseRecipePreparations(input.preparationText ?? "").map(
			(text) => ({
				id: createId(),
				text,
			}),
		),
		instructions: parseRecipeInstructions(input.instructionText ?? "").map(
			(text) => ({
				id: createId(),
				text,
				referencedInstructionIds: [],
			}),
		),
		note: input.note?.trim() ?? "",
		sourceUrl: input.sourceUrl?.trim() || null,
		links: input.links ? [...input.links] : [],
		visibility: input.visibility ?? "private",
		stocksWhenMade: input.stocksWhenMade ?? false,
		scalable: input.scalable ?? true,
		cover: input.cover ?? null,
		publicTags: input.publicTags ? [...input.publicTags] : [],
		personalTags: input.personalTags ? [...input.personalTags] : [],
	};
}
