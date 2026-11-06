// 「このレシピをもとに作る」：親のレシピから、新しいレシピの下書きを作る。
// 材料・下準備・作り方の ID は、保存先の表で一意なので、すべて作り直す（作り方の参照も付け替える）。
// 公開範囲は、非公開から始める（公開するかは、本人が決める）。
import type {
	RecipeEditorDocument,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

type CreateId = () => string;

function copyIngredients(
	nodes: readonly RecipeEditorIngredientNode[],
	createId: CreateId,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) =>
		node.type === "group"
			? {
					...node,
					id: createId(),
					children: copyIngredients(node.children, createId),
				}
			: { ...node, id: createId() },
	);
}

export function createForkDocument(
	parent: RecipeEditorDocument,
	createId: CreateId = () => crypto.randomUUID(),
): RecipeEditorDocument {
	const instructionIds = new Map(
		parent.instructions.map((instruction) => [instruction.id, createId()]),
	);

	return {
		name: parent.name,
		yieldText: parent.yieldText,
		ingredients: copyIngredients(parent.ingredients, createId),
		preparations: parent.preparations.map((preparation) => ({
			id: createId(),
			text: preparation.text,
		})),
		instructions: parent.instructions.map((instruction) => ({
			id: instructionIds.get(instruction.id) ?? createId(),
			text: instruction.text,
			referencedInstructionIds: instruction.referencedInstructionIds.flatMap(
				(id) => {
					const copied = instructionIds.get(id);

					return copied === undefined ? [] : [copied];
				},
			),
		})),
		note: parent.note,
		sourceUrl: parent.sourceUrl,
		// 見る人が見られるリンク先だけ（RecipeDetail の links は、そう絞ってある）。
		links: [...parent.links],
		visibility: "private",
		stocksWhenMade: parent.stocksWhenMade ?? false,
		scalable: parent.scalable ?? true,
		cover: parent.cover ?? null,
	};
}
