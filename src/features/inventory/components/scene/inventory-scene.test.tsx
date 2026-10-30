import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { buildInventoryFridge } from "../../domain/inventory-fridge";
import type { InventoryLot } from "../../domain/inventory-lot";
import { InventoryScene } from "./inventory-scene";

function lot(id: string, expiresOn: string | null = null): InventoryLot {
	return {
		id,
		quantity: 1,
		acquiredOn: "2026-10-01",
		storage: null,
		expiresOn,
		expiryKind: expiresOn ? "best-before" : null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
	};
}

const today = "2026-10-30";

function renderScene(onOpen = vi.fn(), onDismissPanel = vi.fn()) {
	const zones = buildInventoryFridge(
		[
			buildInventoryListItem({
				inventoryItemId: "egg",
				name: "卵",
				quantity: 1,
				lots: [lot("l1", "2026-10-29")],
			}),
			buildInventoryListItem({
				inventoryItemId: "shoyu",
				name: "醤油",
				quantity: 1,
				trackingMode: "presence",
				lots: [lot("l2")],
			}),
		],
		today,
	);

	render(
		<InventoryScene
			zones={zones}
			night={false}
			petVisible={false}
			toolbar={null}
			selectedItemId={null}
			onOpen={onOpen}
			onDismissPanel={onDismissPanel}
		/>,
	);

	return onOpen;
}

describe("InventoryScene", () => {
	it("場所ごとの件数と、期限が近いものの件数を、ボタンの名前に出す", () => {
		renderScene();

		expect(
			screen.getByRole("button", {
				name: "冷蔵室をひらく（1件、期限が近いもの1件）",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "ドアポケットをひらく（1件）" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "机の上をひらく（0件）" }),
		).toBeInTheDocument();
	});

	it("場所を押すと庫内の一覧が開き、食材を押すと onOpen が呼ばれ、Esc でもどる", async () => {
		const user = userEvent.setup();
		const onOpen = renderScene();

		await user.click(screen.getByRole("button", { name: /^冷蔵室をひらく/u }));

		const row = await screen.findByRole(
			"button",
			{ name: /^卵、/u },
			{ timeout: 3000 },
		);

		await user.click(row);

		expect(onOpen).toHaveBeenCalledWith(
			expect.objectContaining({ inventoryItemId: "egg" }),
		);

		await user.keyboard("{Escape}");

		await waitFor(() =>
			expect(screen.queryByRole("button", { name: /^卵、/u })).toBeNull(),
		);
	});

	it("庫内の縦タブで、別の場所の一覧に切り替わり、開いていた食材のパネルは閉じる", async () => {
		const user = userEvent.setup();
		const onDismissPanel = vi.fn();

		renderScene(vi.fn(), onDismissPanel);
		await user.click(screen.getByRole("button", { name: /^冷蔵室をひらく/u }));
		await screen.findByRole("button", { name: /^卵、/u }, { timeout: 3000 });
		expect(onDismissPanel).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: /^ドア\s*1$/u }));

		expect(onDismissPanel).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByRole("button", { name: /^醤油、/u }),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^卵、/u })).toBeNull();
	});
});
