import type {
	RecipeEditorIngredientGroup,
	RecipeEditorIngredientItem,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

// プレビューでの材料の手直し（純粋関数）。

export function mapIngredientItems(
	nodes: readonly RecipeEditorIngredientNode[],
	update: (item: RecipeEditorIngredientItem) => RecipeEditorIngredientItem,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) =>
		node.type === "group"
			? { ...node, children: node.children.map(update) }
			: update(node),
	);
}

export function updateIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
	changes: { name?: string; amountText?: string },
): RecipeEditorIngredientNode[] {
	return mapIngredientItems(nodes, (node) => {
		if (node.id !== id) return node;

		const name = changes.name ?? node.name;
		const amountText = changes.amountText ?? node.amountText ?? "";
		const hasAmount = amountText.trim().length > 0;
		// 増減のしかたは、名前・分量を直しても残す。
		const weight =
			node.scaleWeight === undefined ? {} : { scaleWeight: node.scaleWeight };

		return hasAmount
			? {
					type: "ingredient",
					status: "parsed",
					id: node.id,
					name,
					rawText: `${name} ${amountText}`,
					amountText,
					quantity: changes.amountText === undefined ? node.quantity : null,
					unitLabel: changes.amountText === undefined ? node.unitLabel : null,
					...weight,
				}
			: {
					type: "ingredient",
					status: "missing-amount",
					id: node.id,
					name,
					rawText: name,
					amountText: null,
					quantity: null,
					unitLabel: null,
					...weight,
				};
	});
}

// 量を変えたときの増減のしかたを変える（通常は、持たない）。本文の行は変えないので、手直しには数えない。
export function setIngredientScaleWeight(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
	weight: number,
): RecipeEditorIngredientNode[] {
	return mapIngredientItems(nodes, (node) => {
		if (node.id !== id) return node;

		const { scaleWeight: _previous, ...rest } = node;

		return weight === 1 ? rest : { ...rest, scaleWeight: weight };
	});
}

export function createIngredientItem(
	id: string,
	name: string,
	amountText: string,
): RecipeEditorIngredientItem {
	if (amountText.length === 0) {
		return {
			type: "ingredient",
			status: "missing-amount",
			id,
			name,
			rawText: name,
			amountText: null,
			quantity: null,
			unitLabel: null,
		};
	}

	return {
		type: "ingredient",
		status: "parsed",
		id,
		name,
		rawText: `${name} ${amountText}`,
		amountText,
		quantity: null,
		unitLabel: null,
	};
}

export function createIngredientGroup(
	id: string,
	name: string,
): RecipeEditorIngredientGroup {
	return {
		type: "group",
		id,
		name,
		rawText: name,
		inferred: false,
		children: [],
	};
}

function isGroup(
	node: RecipeEditorIngredientNode,
	groupId: string,
): node is RecipeEditorIngredientGroup {
	return node.type === "group" && node.id === groupId;
}

export function removeEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientNode[] {
	return nodes.filter(
		(node) => !(isGroup(node, groupId) && node.children.length === 0),
	);
}

// グループの ID と、その中のすべての材料の ID。
export function collectIngredientIds(
	node: RecipeEditorIngredientNode,
): string[] {
	return node.type === "group"
		? [node.id, ...node.children.map((child) => child.id)]
		: [node.id];
}

export function findIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientGroup | null {
	return nodes.find((node) => isGroup(node, groupId)) ?? null;
}

// グループだけを消す。中の材料は、そのグループがあった位置に残る（グループ外へ出る）。
export function dissolveIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientNode[] {
	return nodes.flatMap<RecipeEditorIngredientNode>((node) =>
		isGroup(node, groupId) ? node.children : [node],
	);
}

// グループと、中の材料を、すべて消す。
export function removeIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientNode[] {
	return nodes.filter((node) => !isGroup(node, groupId));
}

export function hasEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
): boolean {
	return nodes.some(
		(node) => node.type === "group" && node.children.length === 0,
	);
}

export function renameIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
	name: string,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) =>
		isGroup(node, groupId) ? { ...node, name, rawText: name } : node,
	);
}

export function removeIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	itemId: string,
): {
	remaining: RecipeEditorIngredientNode[];
	removed: RecipeEditorIngredientItem | null;
} {
	let removed: RecipeEditorIngredientItem | null = null;
	const remaining: RecipeEditorIngredientNode[] = [];

	for (const node of nodes) {
		if (node.type === "ingredient") {
			if (node.id === itemId) {
				removed = node;
			} else {
				remaining.push(node);
			}
			continue;
		}

		const children: RecipeEditorIngredientItem[] = [];

		for (const child of node.children) {
			if (child.id === itemId) {
				removed = child;
			} else {
				children.push(child);
			}
		}

		// 取り出して空になったグループは消す。もともと空のグループ（作成直後）は残す。
		if (children.length > 0 || node.children.length === 0) {
			remaining.push({ ...node, children });
		}
	}

	return { remaining, removed };
}

export function moveIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	itemId: string,
	targetGroupId: string | null,
): RecipeEditorIngredientNode[] {
	const { remaining, removed: movedItem } = removeIngredientItem(nodes, itemId);

	if (!movedItem) return [...nodes];
	if (targetGroupId === null) return [...remaining, movedItem];

	let foundTarget = false;
	const result = remaining.map((node) => {
		if (!isGroup(node, targetGroupId)) return node;

		foundTarget = true;
		return { ...node, children: [...node.children, movedItem] };
	});

	return foundTarget ? result : [...nodes];
}
