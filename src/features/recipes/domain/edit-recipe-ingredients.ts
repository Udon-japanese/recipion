import type {
	RecipeEditorIngredientGroup,
	RecipeEditorIngredientItem,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

// プレビューでの材料の手直し（純粋関数）。

export function updateIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
	changes: { name?: string; amountText?: string },
): RecipeEditorIngredientNode[] {
	return nodes.map((node) => {
		if (node.type === "group") {
			return {
				...node,
				children: updateIngredientItem(node.children, id, changes),
			};
		}

		if (node.id !== id) return node;

		const name = changes.name ?? node.name;
		const amountText = changes.amountText ?? node.amountText ?? "";
		const hasAmount = amountText.trim().length > 0;

		const updated: RecipeEditorIngredientItem = hasAmount
			? {
					type: "ingredient",
					status: "parsed",
					id: node.id,
					name,
					rawText: `${name} ${amountText}`,
					amountText,
					quantity: changes.amountText === undefined ? node.quantity : null,
					unitLabel: changes.amountText === undefined ? node.unitLabel : null,
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
				};

		return updated;
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

export function removeEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
): RecipeEditorIngredientNode[] {
	return nodes.flatMap<RecipeEditorIngredientNode>((node) => {
		if (node.type !== "group") return [node];

		if (node.id === groupId && node.children.length === 0) return [];

		return [
			{ ...node, children: removeEmptyIngredientGroup(node.children, groupId) },
		];
	});
}

export function hasEmptyIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
): boolean {
	return nodes.some(
		(node) =>
			node.type === "group" &&
			(node.children.length === 0 || hasEmptyIngredientGroup(node.children)),
	);
}

export function renameIngredientGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	groupId: string,
	name: string,
): RecipeEditorIngredientNode[] {
	return nodes.map((node) => {
		if (node.type !== "group") return node;

		if (node.id === groupId) {
			return { ...node, name, rawText: name };
		}

		return {
			...node,
			children: renameIngredientGroup(node.children, groupId, name),
		};
	});
}

export function removeIngredientItem(
	nodes: readonly RecipeEditorIngredientNode[],
	itemId: string,
): {
	remaining: RecipeEditorIngredientNode[];
	removed: RecipeEditorIngredientItem | null;
} {
	let removed: RecipeEditorIngredientItem | null = null;

	function remove(
		current: readonly RecipeEditorIngredientNode[],
	): RecipeEditorIngredientNode[] {
		const result: RecipeEditorIngredientNode[] = [];

		for (const node of current) {
			if (node.type === "ingredient") {
				if (node.id === itemId) {
					removed = node;
				} else {
					result.push(node);
				}
				continue;
			}

			const children = remove(node.children);
			// 取り出して空になったグループは消す。もともと空のグループ（作成直後）は残す。
			if (children.length > 0 || node.children.length === 0) {
				result.push({ ...node, children });
			}
		}

		return result;
	}

	return { remaining: remove(nodes), removed };
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

	function insert(
		current: readonly RecipeEditorIngredientNode[],
	): RecipeEditorIngredientNode[] {
		return current.map((node) => {
			if (node.type !== "group") return node;

			if (node.id === targetGroupId && movedItem !== null) {
				foundTarget = true;
				return { ...node, children: [...node.children, movedItem] };
			}

			return { ...node, children: insert(node.children) };
		});
	}

	const result = insert(remaining);
	return foundTarget ? result : [...nodes];
}
