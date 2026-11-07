import { liveQuery } from "dexie";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingBranchRepository } from "../application/shopping-branch-repository";
import {
	ownerSortRange,
	toShoppingBranch,
	withOwner,
} from "./owned-shopping-records";

// その持ち主の、条件つきのメモ。
export function createDexieShoppingBranchRepository(
	ownerScope: InventoryPurchaseOwnerScope,
) {
	async function listBranches() {
		const [lower, upper] = ownerSortRange(ownerScope);
		const records = await getLocalDatabase()
			.shoppingBranches.where("[ownerScope+sortOrder]")
			.between(lower, upper, true, true)
			.toArray();

		return records.map(toShoppingBranch);
	}

	async function isOwnedBranch(branchId: string) {
		const branch = await getLocalDatabase().shoppingBranches.get(branchId);

		return branch?.ownerScope === ownerScope;
	}

	return {
		list: listBranches,

		watch(onChange, onError) {
			const subscription = liveQuery(listBranches).subscribe({
				next: onChange,
				error: onError,
			});

			return () => subscription.unsubscribe();
		},

		async create(branch, conditionItem) {
			const database = getLocalDatabase();

			await database.transaction(
				"rw",
				database.shoppingBranches,
				database.shoppingItems,
				async () => {
					await database.shoppingBranches.put(withOwner(branch, ownerScope));
					await database.shoppingItems.put(
						withOwner(conditionItem, ownerScope),
					);
				},
			);
		},

		async update(branch) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingBranches, async () => {
				if (await isOwnedBranch(branch.id)) {
					await database.shoppingBranches.put(withOwner(branch, ownerScope));
				}
			});
		},

		async remove(branchId) {
			const database = getLocalDatabase();

			await database.transaction(
				"rw",
				database.shoppingBranches,
				database.shoppingItems,
				async () => {
					if (!(await isOwnedBranch(branchId))) {
						return;
					}

					await database.shoppingItems
						.where("branchId")
						.equals(branchId)
						.delete();
					await database.shoppingBranches.delete(branchId);
				},
			);
		},

		async setSideLabel(branchId, side, label) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingBranches, async () => {
				if (await isOwnedBranch(branchId)) {
					await database.shoppingBranches.update(
						branchId,
						side === "then" ? { thenLabel: label } : { elseLabel: label },
					);
				}
			});
		},

		async applyDecision(branchId, released, discardedIds) {
			const database = getLocalDatabase();

			await database.transaction(
				"rw",
				database.shoppingBranches,
				database.shoppingItems,
				async () => {
					if (!(await isOwnedBranch(branchId))) {
						return;
					}

					await database.shoppingItems.bulkPut(
						released.map((item) => withOwner(item, ownerScope)),
					);
					await database.shoppingItems.bulkDelete([...discardedIds]);
					await database.shoppingBranches.delete(branchId);
				},
			);
		},
	} satisfies ShoppingBranchRepository;
}
