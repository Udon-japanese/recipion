import { parseIngredientLine } from "#/features/ingredients/domain/parse-ingredient-line";
import {
	formatIngredientGroupLine,
	formatIngredientLine,
} from "./format-recipe-editor-text";
import type {
	ParsedRecipeIngredientGroup,
	ParsedRecipeIngredientNode,
} from "./parse-recipe-ingredients";
import type {
	RecipeEditorIngredientGroup,
	RecipeEditorIngredientItem,
	RecipeEditorIngredientNode,
} from "./recipe-editor-document";

// 入力欄の文章を解析し直したとき、プレビューでの手直しを残すための状態。
export type IngredientSyncState = {
	nodes: RecipeEditorIngredientNode[];
	// 材料・グループの ID → 取り込んだときの元の行。ここにない ID は、プレビューで追加したもの。
	sources: ReadonlyMap<string, string>;
	// プレビューで、名前・分量・グループを直した ID。
	edited: ReadonlySet<string>;
	// プレビューで消した、元の行（入力欄の文章には、まだ残っている行）。解析し直しても、出さない。
	dismissed: readonly string[];
};

type PreviousEntry = {
	node: RecipeEditorIngredientNode;
	parentId: string | null;
};

function flatten(
	nodes: readonly RecipeEditorIngredientNode[],
	parentId: string | null,
	entries: PreviousEntry[],
): PreviousEntry[] {
	for (const node of nodes) {
		entries.push({ node, parentId });

		if (node.type === "group") {
			flatten(node.children, node.id, entries);
		}
	}

	return entries;
}

// ☆ ★ や A などの印を除いた、グループ名の比較用の文字列。
export function normalizeGroupName(name: string): string {
	return name
		.normalize("NFKC")
		.replace(/^[☆★◎○●◆◇■□▲△]\s*/u, "")
		.trim();
}

function removeNode(
	nodes: RecipeEditorIngredientNode[],
	id: string,
): RecipeEditorIngredientNode | null {
	for (const [index, node] of nodes.entries()) {
		if (node.id === id) {
			nodes.splice(index, 1);

			return node;
		}

		if (node.type === "group") {
			const removed = removeNode(node.children, id);

			if (removed) {
				return removed;
			}
		}
	}

	return null;
}

function findGroup(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
): RecipeEditorIngredientGroup | null {
	for (const node of nodes) {
		if (node.type !== "group") {
			continue;
		}

		if (node.id === id) {
			return node;
		}

		const found = findGroup(node.children, id);

		if (found) {
			return found;
		}
	}

	return null;
}

function findParentId(
	nodes: readonly RecipeEditorIngredientNode[],
	id: string,
	parentId: string | null = null,
): string | null | undefined {
	for (const node of nodes) {
		if (node.id === id) {
			return parentId;
		}

		if (node.type === "group") {
			const found = findParentId(node.children, id, node.id);

			if (found !== undefined) {
				return found;
			}
		}
	}

	return undefined;
}

// 入力欄の文章を解析し直した結果（parsed）に、プレビューでの手直しを引き継ぐ。
// - 元の行が変わっていない材料は、前の ID と、プレビューでの手直し（名前・分量・グループ）を引き継ぐ。
// - 元の行を書き換えた材料は、解析し直した結果になる（手直しは、その行を書き換えた時点で、役目を終える）。
// - プレビューで追加した材料・グループは、そのまま残す。
export function reconcileRecipeIngredients(
	previous: IngredientSyncState,
	parsedNodes: readonly ParsedRecipeIngredientNode[],
	createId: () => string = () => crypto.randomUUID(),
): IngredientSyncState {
	const remainingDismissed = [...previous.dismissed];
	const usedDismissed: string[] = [];

	// 消した行は出さない。消したグループの材料は、グループ外に出す。
	function takeDismissed(rawText: string): boolean {
		const index = remainingDismissed.indexOf(rawText);

		if (index < 0) {
			return false;
		}

		remainingDismissed.splice(index, 1);
		usedDismissed.push(rawText);

		return true;
	}

	const visibleParsedNodes = parsedNodes.flatMap<ParsedRecipeIngredientNode>(
		(node) => {
			if (node.type === "ingredient") {
				return takeDismissed(node.rawText) ? [] : [node];
			}

			const children = node.children.filter(
				(child) => !takeDismissed(child.rawText),
			);

			if (takeDismissed(node.rawText)) {
				return children;
			}

			return children.length > 0 ? [{ ...node, children }] : [];
		},
	);

	const previousEntries = flatten(previous.nodes, null, []);
	const entryById = new Map(
		previousEntries.map((entry) => [entry.node.id, entry]),
	);

	// 元の行ごとの、前の材料の待ち行列（同じ行が複数あるときは、前から順に対応させる）。
	const availableItems = new Map<string, PreviousEntry[]>();

	for (const entry of previousEntries) {
		const source = previous.sources.get(entry.node.id);

		if (entry.node.type === "ingredient" && source !== undefined) {
			availableItems.set(source, [
				...(availableItems.get(source) ?? []),
				entry,
			]);
		}
	}

	const sources = new Map<string, string>();
	const edited = new Set<string>();
	const usedGroupIds = new Set<string>();
	// 前の材料と対応づいた材料の ID → 前の親（グループの ID。グループ外は null）。
	const matchedParents = new Map<string, string | null>();

	function buildItem(
		parsed: Extract<ParsedRecipeIngredientNode, { type: "ingredient" }>,
	): RecipeEditorIngredientItem {
		const entry = availableItems.get(parsed.rawText)?.shift();

		if (!entry || entry.node.type !== "ingredient") {
			const id = createId();

			sources.set(id, parsed.rawText);

			return { ...parsed, id };
		}

		const id = entry.node.id;

		sources.set(id, parsed.rawText);
		matchedParents.set(id, entry.parentId);

		if (previous.edited.has(id)) {
			edited.add(id);

			return entry.node;
		}

		return { ...parsed, id };
	}

	function buildGroup(
		parsed: ParsedRecipeIngredientGroup,
	): RecipeEditorIngredientGroup {
		const children = parsed.children.map(buildItem);

		// 子が前のどのグループにあったか、なければ、グループ名が同じ前のグループに、対応づける。
		const parentIdOfChildren = children
			.map((child) => matchedParents.get(child.id))
			.find(
				(parentId): parentId is string =>
					typeof parentId === "string" && !usedGroupIds.has(parentId),
			);

		const previousGroup = (
			parentIdOfChildren
				? entryById.get(parentIdOfChildren)?.node
				: previousEntries
						.map((entry) => entry.node)
						.find(
							(node) =>
								node.type === "group" &&
								!usedGroupIds.has(node.id) &&
								previous.sources.has(node.id) &&
								normalizeGroupName(node.name) ===
									normalizeGroupName(parsed.name),
						)
		) as RecipeEditorIngredientGroup | undefined;

		if (!previousGroup || previousGroup.type !== "group") {
			const id = createId();

			sources.set(id, parsed.rawText);

			return { ...parsed, id, children };
		}

		usedGroupIds.add(previousGroup.id);
		sources.set(previousGroup.id, parsed.rawText);

		const isEdited = previous.edited.has(previousGroup.id);
		const keepsName =
			isEdited ||
			normalizeGroupName(previousGroup.name) ===
				normalizeGroupName(parsed.name);

		if (isEdited) {
			edited.add(previousGroup.id);
		}

		return {
			...parsed,
			id: previousGroup.id,
			name: keepsName ? previousGroup.name : parsed.name,
			rawText: keepsName ? previousGroup.rawText : parsed.rawText,
			inferred: isEdited ? previousGroup.inferred : parsed.inferred,
			children,
		};
	}

	const nodes: RecipeEditorIngredientNode[] = visibleParsedNodes.map((node) =>
		node.type === "group" ? buildGroup(node) : buildItem(node),
	);

	// プレビューで追加したグループ（元の行がないもの）は、空にして、残す。
	for (const entry of previousEntries) {
		if (
			entry.node.type === "group" &&
			!previous.sources.has(entry.node.id) &&
			!usedGroupIds.has(entry.node.id)
		) {
			nodes.push({ ...entry.node, children: [] });
			usedGroupIds.add(entry.node.id);
		}
	}

	// プレビューで別のグループへ動かした材料は、動かした先に戻す。
	for (const [id, previousParentId] of matchedParents) {
		if (!previous.edited.has(id)) {
			continue;
		}

		const currentParentId = findParentId(nodes, id);

		if (currentParentId === previousParentId) {
			continue;
		}

		const target =
			previousParentId === null
				? nodes
				: findGroup(nodes, previousParentId)?.children;

		if (!target) {
			continue;
		}

		const moved = removeNode(nodes, id);

		if (moved) {
			target.push(moved);
		}
	}

	// プレビューで追加した材料（元の行がないもの）は、追加した場所に残す。
	for (const entry of previousEntries) {
		if (
			entry.node.type !== "ingredient" ||
			previous.sources.has(entry.node.id)
		) {
			continue;
		}

		const target =
			(entry.parentId ? findGroup(nodes, entry.parentId)?.children : null) ??
			nodes;

		target.push(entry.node);
		edited.add(entry.node.id);
	}

	return { nodes, sources, edited, dismissed: usedDismissed };
}

// 保存済みのレシピの材料から、同期の状態を作る（元の行は、文章に書き戻した行）。
// 解析し直すと、保存済みの名前・分量と変わる材料は、手直し済みとして、保存済みの内容を守る。
export function createIngredientSyncState(
	nodes: readonly RecipeEditorIngredientNode[],
): IngredientSyncState {
	const sources = new Map<string, string>();
	const edited = new Set<string>();

	function register(node: RecipeEditorIngredientNode) {
		if (node.type === "group") {
			sources.set(node.id, formatIngredientGroupLine(node.name));

			for (const child of node.children) {
				register(child);
			}

			return;
		}

		const line = formatIngredientLine(node);
		const reparsed = parseIngredientLine(line);

		sources.set(node.id, line);

		if (
			reparsed?.name !== node.name ||
			reparsed.amountText !== node.amountText
		) {
			edited.add(node.id);
		}
	}

	for (const node of nodes) {
		register(node);
	}

	return { nodes: [...nodes], sources, edited, dismissed: [] };
}

export const emptyIngredientSyncState: IngredientSyncState = {
	nodes: [],
	sources: new Map(),
	edited: new Set(),
	dismissed: [],
};
