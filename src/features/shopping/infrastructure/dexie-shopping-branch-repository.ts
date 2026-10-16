import { liveQuery } from "dexie";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingBranchRepository } from "../application/shopping-branch-repository";

export const dexieShoppingBranchRepository = {
	async list() {
		return getLocalDatabase().shoppingBranches.orderBy("sortOrder").toArray();
	},

	watch(onChange, onError) {
		const subscription = liveQuery(() =>
			getLocalDatabase().shoppingBranches.orderBy("sortOrder").toArray(),
		).subscribe({ next: onChange, error: onError });

		return () => subscription.unsubscribe();
	},

	async create(branch, conditionItem) {
		const database = getLocalDatabase();

		await database.transaction(
			"rw",
			database.shoppingBranches,
			database.shoppingItems,
			async () => {
				await database.shoppingBranches.put(branch);
				await database.shoppingItems.put(conditionItem);
			},
		);
	},

	async update(branch) {
		await getLocalDatabase().shoppingBranches.put(branch);
	},

	async remove(branchId) {
		const database = getLocalDatabase();

		await database.transaction(
			"rw",
			database.shoppingBranches,
			database.shoppingItems,
			async () => {
				await database.shoppingItems
					.where("branchId")
					.equals(branchId)
					.delete();
				await database.shoppingBranches.delete(branchId);
			},
		);
	},

	async setSideLabel(branchId, side, label) {
		await getLocalDatabase().shoppingBranches.update(
			branchId,
			side === "then" ? { thenLabel: label } : { elseLabel: label },
		);
	},

	async applyDecision(branchId, released, discardedIds) {
		const database = getLocalDatabase();

		await database.transaction(
			"rw",
			database.shoppingBranches,
			database.shoppingItems,
			async () => {
				await database.shoppingItems.bulkPut([...released]);
				await database.shoppingItems.bulkDelete([...discardedIds]);
				await database.shoppingBranches.delete(branchId);
			},
		);
	},
} satisfies ShoppingBranchRepository;
