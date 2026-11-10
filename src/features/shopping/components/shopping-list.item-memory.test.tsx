import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { createFakeShoppingConversionDefaultRepository } from "#/test/fakes/fake-shopping-conversion-default-repository";
import { createFakeShoppingItemMemoryRepository } from "#/test/fakes/fake-shopping-item-memory-repository";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import {
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "../domain/shopping-conversion-default";
import { ShoppingList } from "./shopping-list";

const nameKey = toConversionDefaultKey("卵") ?? "";

// 卵は、前回 2パック（1パック＝10個）を、お菓子・製菓材料として入れた。
function renderWithMemory() {
	const itemMemoryRepository = createFakeShoppingItemMemoryRepository({
		[nameKey]: {
			nameKey,
			quantity: 2,
			unitLabel: "パック",
			categoryId: "snacks",
			categoryAssignment: "manual",
			usedAt: 1,
		},
	});
	const conversionDefaultRepository =
		createFakeShoppingConversionDefaultRepository({
			[toConversionMemoryKey(nameKey, "パック")]: {
				nameKey,
				unitLabel: "パック",
				inventoryConversion: {
					inputUnitCode: "パック",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 10,
					trackingMode: "estimated",
				},
				usedAt: 1,
			},
		});
	const repository = createFakeShoppingRepository();

	render(
		<ShoppingList
			repository={repository}
			itemMemoryRepository={itemMemoryRepository}
			conversionDefaultRepository={conversionDefaultRepository}
		/>,
	);

	return { repository, itemMemoryRepository };
}

async function openAddSheet(user: ReturnType<typeof userEvent.setup>) {
	await screen.findByText("買うものはまだありません。");
	await user.click(screen.getByRole("button", { name: "買うものを入れる" }));
}

describe("ShoppingList：いつもの買い方", () => {
	it("前に入れた食材は、名前を入れると、前回の数量・単位・換算・カテゴリが入る", async () => {
		const user = userEvent.setup();
		const { repository } = renderWithMemory();

		await openAddSheet(user);
		await user.type(screen.getByLabelText("買うもの"), "卵");

		await waitFor(() => expect(screen.getByLabelText("数量")).toHaveValue("2"));
		expect(screen.getByLabelText("単位")).toHaveValue("パック");
		expect(screen.getByText("お菓子・製菓材料")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "2パック（20個）" }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() =>
			expect(repository.items).toContainEqual(
				expect.objectContaining({
					name: "卵",
					quantity: 2,
					unitLabel: "パック",
					categoryId: "snacks",
					inventoryConversion: expect.objectContaining({
						stockQuantityPerInputUnit: 10,
					}),
				}),
			),
		);
	});

	it("自分で直した数量は、名前を直しても、覚えた量で上書きしない", async () => {
		const user = userEvent.setup();

		renderWithMemory();
		await openAddSheet(user);
		await user.type(screen.getByLabelText("買うもの"), "卵");
		await waitFor(() => expect(screen.getByLabelText("数量")).toHaveValue("2"));
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "3");
		await user.type(screen.getByLabelText("買うもの"), "x{Backspace}");

		expect(screen.getByLabelText("数量")).toHaveValue("3");
	});

	it("追加した項目は、その食材のいつもの買い方として覚える", async () => {
		const user = userEvent.setup();
		const { itemMemoryRepository } = renderWithMemory();

		await openAddSheet(user);
		await user.type(screen.getByLabelText("買うもの"), "牛乳");
		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "2");
		await user.type(screen.getByLabelText("単位"), "本");
		await user.click(screen.getByRole("button", { name: "追加" }));

		await waitFor(() =>
			expect(
				itemMemoryRepository.memories[toConversionDefaultKey("牛乳") ?? ""],
			).toMatchObject({ quantity: 2, unitLabel: "本" }),
		);
	});

	it("購入確定した項目の内容で、いつもの買い方を覚え直す", async () => {
		const user = userEvent.setup();
		const itemMemoryRepository = createFakeShoppingItemMemoryRepository();
		const checkedItem = buildShoppingItem({
			name: "牛乳",
			quantity: 3,
			unitLabel: "本",
			status: "checked",
			inventoryConversion: {
				inputUnitCode: "本",
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				stockQuantityPerInputUnit: 1000,
				trackingMode: "estimated",
			},
		});

		render(
			<ShoppingList
				repository={createFakeShoppingRepository([checkedItem])}
				itemMemoryRepository={itemMemoryRepository}
				conversionDefaultRepository={createFakeShoppingConversionDefaultRepository()}
				confirmPurchases={vi.fn().mockResolvedValue({
					status: "confirmed",
					items: [{ ...checkedItem, status: "purchased" }],
				})}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: "購入を確定（1件）" }),
		);
		await user.click(await screen.findByRole("button", { name: "購入確定" }));

		await waitFor(() =>
			expect(
				itemMemoryRepository.memories[toConversionDefaultKey("牛乳") ?? ""],
			).toMatchObject({ quantity: 3, unitLabel: "本" }),
		);
	});
});
