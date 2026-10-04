import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InventoryRegistrationForm } from "./inventory-registration-form";

describe("InventoryRegistrationForm", () => {
	it("カタログにある食材は、単位と管理方法を自動で入れ、数量つきで登録する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});
		const onRegistered = vi.fn();

		render(
			<InventoryRegistrationForm
				registerInventoryItem={registerInventoryItem}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "卵");

		// 卵は、「個」で、正確に管理
		expect(screen.getByRole("combobox", { name: "在庫の単位" })).toHaveValue(
			"count",
		);
		expect(screen.getByRole("combobox", { name: "管理方法" })).toHaveValue(
			"exact",
		);

		await user.type(screen.getByRole("spinbutton", { name: /数量/u }), "6");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "卵",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					trackingMode: "exact",
					initialQuantity: 6,
					transactionId: expect.any(String),
				}),
			),
		);
		expect(onRegistered).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("卵を在庫に追加しました"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("食材名")).toHaveValue("");
	});

	it("数量が空欄なら、食材だけを登録する（初期数量0）", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});

		render(
			<InventoryRegistrationForm
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "醤油");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "醤油",
					stockUnitCode: "ml",
					initialQuantity: 0,
				}),
			),
		);
	});

	it("数量が負なら、送信せずに理由を表示する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn();

		render(
			<InventoryRegistrationForm
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "塩");
		await user.type(screen.getByRole("spinbutton", { name: /数量/u }), "-5");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		expect((await screen.findByRole("alert")).textContent).toContain("0以上");
		expect(registerInventoryItem).not.toHaveBeenCalled();
	});

	it("登録に失敗したら、入力を残して、失敗を表示する", async () => {
		const user = userEvent.setup();
		const onRegistered = vi.fn();

		render(
			<InventoryRegistrationForm
				registerInventoryItem={vi.fn().mockRejectedValue(new Error("network"))}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "塩");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"在庫に追加できませんでした",
		);
		expect(screen.getByLabelText("食材名")).toHaveValue("塩");
		expect(onRegistered).not.toHaveBeenCalled();
	});

	it("「ある」を押すと、数量を入れず、目印だけを付けて登録する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});
		const onRegistered = vi.fn();

		render(
			<InventoryRegistrationForm
				registerInventoryItem={registerInventoryItem}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "塩");
		await user.type(screen.getByRole("spinbutton", { name: /数量/u }), "500");
		await user.click(screen.getByRole("button", { name: /^ある/u }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "塩",
					stockUnitCode: "g",
					initialQuantity: 0,
					markAsAvailable: true,
				}),
			),
		);
		expect(onRegistered).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("塩を「ある」で登録しました"),
		).toBeInTheDocument();
	});

	it("食材名の候補から選ぶと、単位が入る", async () => {
		const user = userEvent.setup();

		render(
			<InventoryRegistrationForm
				registerInventoryItem={vi.fn()}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "しょう");
		await user.click(await screen.findByRole("option", { name: "醤油" }));

		expect(screen.getByLabelText("食材名")).toHaveValue("醤油");
		expect(screen.getByRole("combobox", { name: "在庫の単位" })).toHaveValue(
			"ml",
		);
	});
});
