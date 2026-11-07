import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingItem, type ShoppingItem } from "../domain/shopping-item";
import { createDexieShoppingRepository } from "./dexie-shopping-repository";

// このテストの持ち主（ゲスト）のメモの保存先。
const dexieShoppingRepository = createDexieShoppingRepository("guest");

describe("dexieShoppingRepository", () => {
	beforeEach(async () => {
		await getLocalDatabase().shoppingItems.clear();
	});

	it("買い物項目を保存して取得できる", async () => {
		const item = createShoppingItem(
			{
				name: "卵",
				quantity: 6,
				unitLabel: "個",
			},
			new Date("2026-09-21T10:00:00.000Z"),
		);

		await dexieShoppingRepository.save(item);

		await expect(dexieShoppingRepository.findById(item.id)).resolves.toEqual(
			item,
		);
	});

	it("同じIDの項目を更新できる", async () => {
		const item = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-21T10:00:00.000Z"),
		);

		await dexieShoppingRepository.save(item);
		await dexieShoppingRepository.save({
			...item,
			quantity: 2,
			updatedAt: "2026-09-21T11:00:00.000Z",
		});

		await expect(
			dexieShoppingRepository.findById(item.id),
		).resolves.toMatchObject({
			id: item.id,
			quantity: 2,
			updatedAt: "2026-09-21T11:00:00.000Z",
		});
	});

	it("指定された並び順で一覧を取得する", async () => {
		const firstItem = {
			...createShoppingItem(
				{ name: "卵" },
				new Date("2026-09-21T11:00:00.000Z"),
			),
			sortOrder: 0,
		};
		const secondItem = {
			...createShoppingItem(
				{ name: "牛乳" },
				new Date("2026-09-21T10:00:00.000Z"),
			),
			sortOrder: 1,
		};

		await dexieShoppingRepository.save(secondItem);
		await dexieShoppingRepository.save(firstItem);

		const items = await dexieShoppingRepository.list();

		expect(items.map((item) => item.id)).toEqual([firstItem.id, secondItem.id]);
	});

	it("買い物項目を削除できる", async () => {
		const item = createShoppingItem({ name: "食パン" });

		await dexieShoppingRepository.save(item);
		await dexieShoppingRepository.remove(item.id);

		await expect(
			dexieShoppingRepository.findById(item.id),
		).resolves.toBeUndefined();
	});

	it("複数の買い物項目をまとめて保存する", async () => {
		const firstItem = createShoppingItem(
			{ name: "卵" },
			new Date("2026-09-21T10:00:00.000Z"),
			1,
		);
		const secondItem = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-21T10:01:00.000Z"),
			0,
		);

		await dexieShoppingRepository.saveAll([firstItem, secondItem]);

		const items = await dexieShoppingRepository.list();

		expect(items.map((item) => item.name)).toEqual(["牛乳", "卵"]);
	});

	// 読み込みの写しを取ったあと、補完を保存するまでの間に、別のタブで変えたとき。
	const now = new Date("2026-09-21T12:00:00.000Z");
	const unassignedEgg = createShoppingItem(
		{ name: "卵" },
		new Date("2026-09-21T10:00:00.000Z"),
	);

	it.each<{
		title: string;
		changeElsewhere: (item: ShoppingItem) => Promise<void>;
		expected: Partial<ShoppingItem> | undefined;
	}>([
		{
			title: "ほかの欄の変更は残し、カテゴリだけ埋める",
			changeElsewhere: (item) =>
				dexieShoppingRepository.save({
					...item,
					quantity: 3,
					status: "checked",
				}),
			expected: {
				quantity: 3,
				status: "checked",
				categoryId: "eggs",
				categoryAssignment: "automatic",
				updatedAt: now.toISOString(),
			},
		},
		{
			title: "手で決めたカテゴリは変えない",
			changeElsewhere: (item) =>
				dexieShoppingRepository.save({
					...item,
					categoryId: "pantry",
					categoryAssignment: "manual",
				}),
			expected: {
				categoryId: "pantry",
				categoryAssignment: "manual",
				updatedAt: unassignedEgg.updatedAt,
			},
		},
		{
			title: "消した項目は戻さない",
			changeElsewhere: (item) => dexieShoppingRepository.remove(item.id),
			expected: undefined,
		},
	])(
		"カテゴリの補完は、保存されている今の値に行う：$title",
		async ({ changeElsewhere, expected }) => {
			await dexieShoppingRepository.save(unassignedEgg);
			await changeElsewhere(unassignedEgg);

			await dexieShoppingRepository.categorizeUnassigned(
				[unassignedEgg.id],
				now,
			);

			const stored = await dexieShoppingRepository.findById(unassignedEgg.id);

			if (expected === undefined) {
				expect(stored).toBeUndefined();
			} else {
				expect(stored).toMatchObject(expected);
			}
		},
	);

	it("ほかの持ち主の項目は、一覧・ID のどちらでも見えず、消せない", async () => {
		const someone = createDexieShoppingRepository("user:someone");
		const guestItem = createShoppingItem({ name: "卵" });
		const someoneItem = createShoppingItem({ name: "牛乳" });

		await dexieShoppingRepository.save(guestItem);
		await someone.save(someoneItem);

		await expect(dexieShoppingRepository.list()).resolves.toEqual([guestItem]);
		await expect(
			dexieShoppingRepository.findById(someoneItem.id),
		).resolves.toBeUndefined();

		await dexieShoppingRepository.removeAll([someoneItem.id, guestItem.id]);

		await expect(someone.list()).resolves.toEqual([someoneItem]);
		await expect(dexieShoppingRepository.list()).resolves.toEqual([]);
	});
});
