import { describe, expect, it } from "vitest";
import {
	resolveShoppingOwnerScope,
	type ShoppingOwnerInput,
	type ShoppingOwnerResolution,
} from "./resolve-shopping-owner-scope";

const base: ShoppingOwnerInput = {
	isPending: false,
	userId: null,
	isUnconfirmed: false,
	signedInOwner: null,
};

describe("resolveShoppingOwnerScope", () => {
	it.each<{
		title: string;
		input: Partial<ShoppingOwnerInput>;
		expected: ShoppingOwnerResolution;
	}>([
		{
			title: "読んでいる間は、まだ決めない",
			input: { isPending: true, signedInOwner: "user:a" },
			expected: { ownerScope: null },
		},
		{
			title: "ログインしている人のメモで、その人を覚える",
			input: { userId: "a" },
			expected: { ownerScope: "user:a", remember: "user:a" },
		},
		{
			title: "確かめられないときは、覚えている人のメモ（覚えた内容は変えない）",
			input: { isUnconfirmed: true, signedInOwner: "user:a" },
			expected: { ownerScope: "user:a" },
		},
		{
			title: "確かめられず、覚えている人もいなければ、ゲスト",
			input: { isUnconfirmed: true },
			expected: { ownerScope: "guest" },
		},
		{
			title: "未ログインと確かめたら、ゲストで、覚えた人を消す",
			input: { signedInOwner: "user:a" },
			expected: { ownerScope: "guest", remember: null },
		},
	])("$title", ({ input, expected }) => {
		expect(resolveShoppingOwnerScope({ ...base, ...input })).toEqual(expected);
	});
});
