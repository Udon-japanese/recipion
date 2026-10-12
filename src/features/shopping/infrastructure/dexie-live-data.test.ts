import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import {
	createShoppingBranch,
	decideShoppingBranch,
} from "../domain/shopping-branch";
import {
	createShoppingItem,
	toggleShoppingItem,
} from "../domain/shopping-item";
import { dexieShoppingBranchRepository } from "./dexie-shopping-branch-repository";
import { confirmCheckedShoppingItemsPurchase } from "./dexie-shopping-purchase";
import { dexieShoppingRepository } from "./dexie-shopping-repository";

// Dexie の購読（liveQuery）が、トランザクションの中の書き込みでも、再実行されることの確認。
describe("買い物メモのライブデータ", () => {
	const unsubscribes: Array<() => void> = [];

	beforeEach(async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.clear();
		await database.shoppingBranches.clear();
		await database.inventoryPurchaseOutbox.clear();
	});

	afterEach(() => {
		for (const unsubscribe of unsubscribes.splice(0)) {
			unsubscribe();
		}
	});

	function collectItemNames() {
		const emissions: string[][] = [];

		unsubscribes.push(
			dexieShoppingRepository.watch(
				(items) => emissions.push(items.map((item) => item.name)),
				(error) => {
					throw error;
				},
			),
		);

		return emissions;
	}

	async function waitForEmissionCount(emissions: unknown[], count: number) {
		await expect
			.poll(() => emissions.length, { timeout: 2000 })
			.toBeGreaterThanOrEqual(count);
	}

	it("最初にいまの一覧が届き、単独の保存・削除でも更新が届く", async () => {
		const emissions = collectItemNames();

		await waitForEmissionCount(emissions, 1);
		expect(emissions.at(-1)).toEqual([]);

		const item = createShoppingItem({ name: "卵" });

		await dexieShoppingRepository.save(item);
		await expect.poll(() => emissions.at(-1)).toEqual(["卵"]);

		await dexieShoppingRepository.remove(item.id);
		await expect.poll(() => emissions.at(-1)).toEqual([]);
	});

	it("トランザクションの中の書き込み（saveAll・購入確定・分岐の確定）でも更新が届く", async () => {
		const emissions = collectItemNames();
		const egg = toggleShoppingItem(
			createShoppingItem({
				name: "卵",
				unitLabel: "個",
				inventoryConversion: {
					inputUnitCode: "個",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 1,
					trackingMode: "exact",
				},
			}),
		);

		await dexieShoppingRepository.saveAll([egg]);
		await expect.poll(() => emissions.at(-1)).toEqual(["卵"]);

		// 購入確定（shoppingItems と inventoryPurchaseOutbox にまたがるトランザクション）。
		await confirmCheckedShoppingItemsPurchase("guest");
		await expect
			.poll(async () => (await dexieShoppingRepository.list())[0]?.status)
			.toBe("purchased");

		const branch = createShoppingBranch({ condition: "売っていたら" }, 0);
		const conditionItem = createShoppingItem({
			name: "合い挽き",
			branchId: branch.id,
			branchSide: "condition",
		});
		const elseItem = createShoppingItem({
			name: "鶏もも",
			branchId: branch.id,
			branchSide: "else",
		});

		await dexieShoppingBranchRepository.create(branch, conditionItem);
		await dexieShoppingRepository.save(elseItem);
		await expect
			.poll(() => emissions.at(-1))
			.toEqual(expect.arrayContaining(["合い挽き", "鶏もも"]));

		// 分岐の確定（複数テーブルにまたがるトランザクション）。
		const { released, discardedIds } = decideShoppingBranch(
			await dexieShoppingRepository.list(),
			branch.id,
			"then",
			10,
		);

		await dexieShoppingBranchRepository.applyDecision(
			branch.id,
			released,
			discardedIds,
		);
		await expect.poll(() => emissions.at(-1)).not.toContain("鶏もも");
		expect(emissions.at(-1)).toContain("合い挽き");
	});
});
