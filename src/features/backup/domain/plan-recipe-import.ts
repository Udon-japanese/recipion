import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "#/features/recipes/domain/recipe-editor-document";
import type { RecipeLinkReference } from "#/features/recipes/domain/recipe-links";

type CreateId = () => string;

// 読み込むレシピの公開 ID の決め方。
// 自分が持っている → 同じレシピなので、飛ばす（二重の読み込み・途中からのやり直しで、増やさない）。
// 空いている → そのまま使う（退会のあと、新しいアカウントで戻すとき）。
// 他の人が使っている → 新しい ID にする。
export type PublicIdOwner = "self" | "other" | null;

export type RecipeImportDecision =
	| { action: "skip"; publicId: string }
	| { action: "create"; publicId: string | null };

export function decideRecipeImport(
	filePublicId: string,
	owner: PublicIdOwner,
): RecipeImportDecision {
	if (owner === "self") {
		return { action: "skip", publicId: filePublicId };
	}

	return { action: "create", publicId: owner === null ? filePublicId : null };
}

function renewIngredientIds(
	nodes: readonly RecipeEditorIngredientNode[],
	createId: CreateId,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) =>
		node.type === "group"
			? {
					...node,
					id: createId(),
					children: renewIngredientIds(node.children, createId),
				}
			: { ...node, id: createId() },
	);
}

// 材料・下準備・作り方の ID は、表の主キー（全体で一意）なので、読み込むたびに作り直す。
// 作り方の、前の工程への参照も、新しい ID に付け替える。
// 公開範囲は、いつも非公開から始める（審査を通っていない文章を、他の人に見せない）。リンクは、別の段で付ける。
export function prepareRecipeImportDocument(
	content: RecipeEditorDocument,
	createId: CreateId = () => crypto.randomUUID(),
): RecipeEditorDocument {
	const instructionIds = new Map(
		content.instructions.map((instruction) => [instruction.id, createId()]),
	);

	return {
		...content,
		ingredients: renewIngredientIds(content.ingredients, createId),
		preparations: content.preparations.map((preparation) => ({
			...preparation,
			id: createId(),
		})),
		instructions: content.instructions.map((instruction) => ({
			...instruction,
			id: instructionIds.get(instruction.id) ?? createId(),
			referencedInstructionIds: instruction.referencedInstructionIds.flatMap(
				(id) => {
					const renewed = instructionIds.get(id);

					return renewed === undefined ? [] : [renewed];
				},
			),
		})),
		visibility: "private",
		links: [],
	};
}

// ファイルの中のレシピへのリンクを、読み込んだあとの公開 ID に付け替える。
// ファイルにないレシピ（他の人の全体公開など）は、そのまま（付けられるかは、サーバーが確かめる）。
export function remapRecipeLinks(
	links: readonly RecipeLinkReference[],
	publicIdByFilePublicId: ReadonlyMap<string, string>,
): RecipeLinkReference[] {
	return links.map((link) => ({
		label: link.label,
		targetPublicId:
			publicIdByFilePublicId.get(link.targetPublicId) ?? link.targetPublicId,
	}));
}
