import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "../domain/shopping-conversion-default";
import { ShoppingBulkAdd } from "./shopping-bulk-add";

// 変換中の補完の方式は、環境ごとに決まる。ここでは、Mac の Chrome（変換を確定させてから置き換える）にする。
vi.mock("#/ime/read-browser-environment", () => ({
	readBrowserEnvironment: () => ({
		userAgent: "Mozilla/5.0 (Macintosh) Chrome/130",
		maxTouchPoints: 0,
		isChromium: true,
	}),
}));

function renderBulkAdd() {
	render(
		<ShoppingBulkAdd
			stores={[]}
			onClose={() => undefined}
			onAdd={async () => 0}
			onCreateStore={async () => null}
		/>,
	);

	return screen.getByRole("textbox", { name: "買うもの（1行に1つ）" });
}

describe("ShoppingBulkAdd の変換中の補完", () => {
	it("変換中でも、Alt+↓で候補を選び、Tab で、変換を確定させて置き換える", async () => {
		const memo = renderBulkAdd() as HTMLTextAreaElement;

		memo.focus();
		fireEvent.compositionStart(memo);
		fireEvent.change(memo, { target: { value: "たまね" } });
		memo.setSelectionRange(3, 3);
		fireEvent.select(memo);

		const list = await screen.findByRole("list", { name: "補完の候補" });

		expect(list).toBeTruthy();

		// 素の矢印は IME に任せる（候補は動かない）。Alt+↓ で選ぶ。
		fireEvent.keyDown(memo, { key: "ArrowDown", isComposing: true });
		fireEvent.keyDown(memo, {
			key: "ArrowDown",
			altKey: true,
			isComposing: true,
		});

		const tab = fireEvent.keyDown(memo, {
			key: "Tab",
			code: "Tab",
			isComposing: true,
		});

		// Tab は IME に渡さない（既定の動作を止めた）。
		expect(tab).toBe(false);
		await waitFor(() => expect(memo.value).not.toBe("たまね"));
		expect(memo.value).toMatch(/^(玉ねぎ|たまねぎ|玉葱)/u);
	});
});

describe("ShoppingBulkAdd の元に戻す", () => {
	it("補完で書き換えたあとも、Ctrl+Z で補完の前に、Ctrl+Shift+Z で補完のあとに戻る", async () => {
		const memo = renderBulkAdd() as HTMLTextAreaElement;

		memo.focus();
		fireEvent.change(memo, { target: { value: "たまね" } });
		memo.setSelectionRange(3, 3);
		fireEvent.select(memo);
		fireEvent.keyDown(memo, { key: "Tab", code: "Tab" });

		await waitFor(() => expect(memo.value).toMatch(/^(玉ねぎ|たまねぎ)/u));

		const completed = memo.value;

		fireEvent.keyDown(memo, { key: "z", ctrlKey: true });
		expect(memo.value).toBe("たまね");

		fireEvent.keyDown(memo, { key: "z", ctrlKey: true, shiftKey: true });
		expect(memo.value).toBe(completed);
	});
});

describe("ShoppingBulkAdd の在庫換算の記憶", () => {
	const milk = {
		unitLabel: "本",
		inventoryConversion: {
			inputUnitCode: "本",
			stockUnitCode: "ml" as const,
			stockUnitLabel: "ml",
			stockQuantityPerInputUnit: 1000,
			trackingMode: "estimated" as const,
		},
	};

	it("数量のない行は、記憶の単位で1つにして（牛乳 1本）、記憶もカタログの既定もない食材は、そのまま", async () => {
		const onAdd = vi.fn(async () => 2);

		render(
			<ShoppingBulkAdd
				stores={[]}
				conversionDefaults={{
					[toConversionMemoryKey(toConversionDefaultKey("牛乳") ?? "", "本")]: {
						...milk,
						nameKey: toConversionDefaultKey("牛乳") ?? "",
						usedAt: 1,
					},
				}}
				onClose={() => undefined}
				onAdd={onAdd}
				onCreateStore={async () => null}
			/>,
		);

		fireEvent.change(
			screen.getByRole("textbox", { name: "買うもの（1行に1つ）" }),
			{ target: { value: "牛乳\nティッシュ" } },
		);

		// 狭い画面は、「確認」のタブに切り替えて、読み取った内容を見る。
		fireEvent.click(screen.getByRole("button", { name: /確認 2/u }));

		const preview = screen.getByRole("list", { name: "読み取った内容" });

		expect(preview.textContent).toContain("牛乳1本");
		expect(preview.textContent).not.toContain("ティッシュ1");

		fireEvent.click(screen.getByRole("button", { name: /2件を追加/u }));

		await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
		const [lines] = onAdd.mock.calls[0] as unknown as [
			{
				name: string;
				unitLabel: string | null;
				inventoryConversion?: unknown;
			}[],
		];

		expect(lines[0]).toMatchObject({
			name: "牛乳",
			unitLabel: "本",
			inventoryConversion: milk.inventoryConversion,
		});
		expect(lines[1]?.inventoryConversion).toBeUndefined();
	});
});
