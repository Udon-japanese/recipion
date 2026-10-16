import * as v from "valibot";
import type { ShoppingItem } from "./shopping-item";

export const maxShoppingBranchCount = 10;
export const maxShoppingBranchConditionLength = 60;
export const maxShoppingBranchLabelLength = 30;

export type ShoppingBranchSide = "then" | "else";

export const shoppingBranchSides = ["then", "else"] as const;

// 分岐の中の項目の役割。condition は、条件になっている材料（例：合い挽き200g）。
// then / else は、条件が当てはまるとき・当てはまらないときに買うもの。
export type ShoppingBranchRole = "condition" | ShoppingBranchSide;

export const defaultShoppingBranchCondition = "売っていたら";

// 分岐型のメモ：条件になっている材料（role が condition の項目）が「どんな時に」当てはまるかが決まるまで、
// 2つの買うもののまとまり（then / else）のどちらを買うかが決まらない。
export type ShoppingBranch = {
	id: string;
	// 条件になっている材料が、どんな時か。例：「売っていたら」「安ければ」。
	// 画面では「<材料>が<条件>」と読む（例：合い挽き200gが売っていたら）。
	condition: string;
	// 各まとまりの呼び名（例：「ハンバーグ」「チキン南蛮」）。省略できる。
	thenLabel: string | null;
	elseLabel: string | null;
	sortOrder: number;
	createdAt: string;
};

const optionalLabelSchema = v.pipe(
	v.optional(v.string(), ""),
	v.trim(),
	v.maxLength(
		maxShoppingBranchLabelLength,
		`呼び名は${maxShoppingBranchLabelLength}文字までにしてください`,
	),
);

const createShoppingBranchInputSchema = v.object({
	condition: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "条件を入力してください"),
		v.maxLength(
			maxShoppingBranchConditionLength,
			`条件は${maxShoppingBranchConditionLength}文字までにしてください`,
		),
	),
	thenLabel: optionalLabelSchema,
	elseLabel: optionalLabelSchema,
});

export type CreateShoppingBranchInput = v.InferInput<
	typeof createShoppingBranchInputSchema
>;

export function createShoppingBranch(
	input: CreateShoppingBranchInput,
	sortOrder: number,
	now = new Date(),
	id: string = crypto.randomUUID(),
): ShoppingBranch {
	const parsed = v.parse(createShoppingBranchInputSchema, input);

	return {
		id,
		condition: parsed.condition,
		thenLabel: parsed.thenLabel || null,
		elseLabel: parsed.elseLabel || null,
		sortOrder,
		createdAt: now.toISOString(),
	};
}

// 条件（どんな時に）と、側の呼び名を直す。
export function updateShoppingBranch(
	branch: ShoppingBranch,
	input: CreateShoppingBranchInput,
): ShoppingBranch {
	const parsed = v.parse(createShoppingBranchInputSchema, input);

	return {
		...branch,
		condition: parsed.condition,
		thenLabel: parsed.thenLabel || null,
		elseLabel: parsed.elseLabel || null,
	};
}

// 側の呼び名が空のとき、レシピの名前などを呼び名にする（すでにあれば、変えない）。長すぎる名前は、切り詰める。
export function suggestShoppingBranchSideLabel(
	branch: ShoppingBranch,
	side: ShoppingBranchSide,
	name: string,
): string | null {
	const current = side === "then" ? branch.thenLabel : branch.elseLabel;
	const label = name.trim().slice(0, maxShoppingBranchLabelLength);

	return current || label === "" ? null : label;
}

export function getShoppingBranchConditionItem(
	items: readonly ShoppingItem[],
	branchId: string,
): ShoppingItem | undefined {
	return items.find(
		(item) => item.branchId === branchId && item.branchSide === "condition",
	);
}

export function getShoppingBranchSideItems(
	items: readonly ShoppingItem[],
	branchId: string,
	side: ShoppingBranchSide,
): ShoppingItem[] {
	return items
		.filter((item) => item.branchId === branchId && item.branchSide === side)
		.sort((left, right) => left.sortOrder - right.sortOrder);
}

export type ShoppingBranchDecision = {
	// 通常の項目として解放する項目（当てはまるときは、条件の材料も。選んだ側。分岐から外し、一覧の最後へ。店・カテゴリはそのまま）。
	released: ShoppingItem[];
	// 捨てる項目の ID（選ばなかった側）。
	discardedIds: string[];
};

// 条件が決まったとき、選んだ側を通常の項目にして、もう一方を捨てる。
// 当てはまった（then）ときは、条件の材料も買うものとして残す（売っていれば、それも買う）。当てはまらなければ、捨てる。
export function decideShoppingBranch(
	branchItems: readonly ShoppingItem[],
	branchId: string,
	side: ShoppingBranchSide,
	startSortOrder: number,
	now = new Date(),
): ShoppingBranchDecision {
	const otherSide: ShoppingBranchSide = side === "then" ? "else" : "then";
	const timestamp = now.toISOString();
	const conditionItem = getShoppingBranchConditionItem(branchItems, branchId);
	const releasedItems = [
		...(side === "then" && conditionItem ? [conditionItem] : []),
		...getShoppingBranchSideItems(branchItems, branchId, side),
	];

	return {
		released: releasedItems.map((item, index) => ({
			...item,
			branchId: null,
			branchSide: null,
			sortOrder: startSortOrder + index,
			updatedAt: timestamp,
		})),
		discardedIds: [
			...(side === "else" && conditionItem ? [conditionItem.id] : []),
			...getShoppingBranchSideItems(branchItems, branchId, otherSide).map(
				(item) => item.id,
			),
		],
	};
}
