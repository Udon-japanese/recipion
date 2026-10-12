import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import {
	createShoppingBranch,
	decideShoppingBranch,
} from "../domain/shopping-branch";
import { createShoppingItem } from "../domain/shopping-item";
import { dexieShoppingBranchRepository } from "./dexie-shopping-branch-repository";
import { dexieShoppingRepository } from "./dexie-shopping-repository";

async function seed() {
	const branch = createShoppingBranch({ condition: "合い挽きがあれば" }, 0);
	const thenItem = createShoppingItem({
		name: "玉ねぎ",
		branchId: branch.id,
		branchSide: "then",
	});
	const elseItem = createShoppingItem({
		name: "鶏もも",
		branchId: branch.id,
		branchSide: "else",
	});
	const plainItem = createShoppingItem({ name: "牛乳" });
	const conditionItem = createShoppingItem({
		name: "合い挽き",
		branchId: branch.id,
		branchSide: "condition",
	});

	await dexieShoppingBranchRepository.create(branch, conditionItem);
	await dexieShoppingRepository.saveAll([thenItem, elseItem, plainItem]);

	return { branch, conditionItem, thenItem, elseItem, plainItem };
}

describe("dexieShoppingBranchRepository", () => {
	beforeEach(async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.clear();
		await database.shoppingBranches.clear();
	});

	it("決定すると、選んだ側が通常の項目になり、選ばなかった側と分岐が消える", async () => {
		const { branch, conditionItem, thenItem, elseItem, plainItem } =
			await seed();
		const items = await dexieShoppingRepository.list();
		const { released, discardedIds } = decideShoppingBranch(
			items,
			branch.id,
			"then",
			5,
		);

		await dexieShoppingBranchRepository.applyDecision(
			branch.id,
			released,
			discardedIds,
		);

		const after = await dexieShoppingRepository.list();

		expect(after.map((item) => item.id).sort()).toEqual(
			[thenItem.id, conditionItem.id, plainItem.id].sort(),
		);
		expect(after.find((item) => item.id === thenItem.id)?.branchId).toBeNull();
		expect(after.some((item) => item.id === elseItem.id)).toBe(false);
		await expect(dexieShoppingBranchRepository.list()).resolves.toEqual([]);
	});

	it("分岐を消すと、中の項目も消え、通常の項目は残る", async () => {
		const { branch, plainItem } = await seed();

		await dexieShoppingBranchRepository.remove(branch.id);

		const after = await dexieShoppingRepository.list();

		expect(after.map((item) => item.id)).toEqual([plainItem.id]);
	});
});
