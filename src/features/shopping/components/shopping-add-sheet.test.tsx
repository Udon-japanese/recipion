import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toConversionDefaultKey } from "../domain/shopping-conversion-default";
import type { CreateShoppingItemInput } from "../domain/shopping-item";
import { ShoppingAddSheet } from "./shopping-add-sheet";

const stores = [
	{
		id: "aeon",
		name: "イオン",
		sortOrder: 0,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
	{
		id: "gyomu",
		name: "業務スーパー",
		sortOrder: 1,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
];

// 単位のチップで選んだ g・kg は、端末に覚える。前のテストの記憶を持ち越さない。
afterEach(() => {
	localStorage.clear();
});

function setup() {
	const onAdd = vi.fn(async (_input: CreateShoppingItemInput) => true);
	const onClose = vi.fn();

	render(
		<ShoppingAddSheet
			title="買うものを入れる"
			stores={stores}
			defaultStoreIdFor={() => null}
			onCreateStore={async () => null}
			onAdd={onAdd}
			onClose={onClose}
		/>,
	);

	return { onAdd, onClose };
}

describe("ShoppingAddSheet", () => {
	it("開くと、名前の欄にすぐ打てる", () => {
		setup();

		expect(screen.getByLabelText("買うもの")).toHaveFocus();
	});

	it("Enter で追加でき、入力は空に戻るが、店は前回のまま続く", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();

		await user.click(screen.getByRole("button", { name: "業務スーパー" }));
		await user.type(screen.getByLabelText("買うもの"), "牛乳{Enter}");

		expect(onAdd).toHaveBeenCalledWith(
			expect.objectContaining({ name: "牛乳", storeId: "gyomu" }),
		);
		expect(await screen.findByText(/牛乳 1/)).toBeInTheDocument();
		expect(screen.getByLabelText("買うもの")).toHaveValue("");

		await user.type(screen.getByLabelText("買うもの"), "卵");

		expect(
			screen.getByRole("button", { name: "業務スーパー" }),
		).toHaveAttribute("aria-pressed", "true");
	});

	it("1つも入れていないあいだは「閉じる」、入れたら「完了」になる", async () => {
		const user = userEvent.setup();
		const { onClose } = setup();

		expect(screen.queryByRole("button", { name: "完了" })).toBeNull();

		await user.type(screen.getByLabelText("買うもの"), "牛乳{Enter}");
		await screen.findByText(/牛乳 1/);

		expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();

		await user.click(screen.getByRole("button", { name: "完了" }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("1つも入れていなければ、「閉じる」で閉じる", async () => {
		const user = userEvent.setup();
		const { onAdd, onClose } = setup();

		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onAdd).not.toHaveBeenCalled();
	});

	it("名前を打ちかけているときは、Esc で閉じない（空なら閉じる）", async () => {
		const user = userEvent.setup();
		const { onClose } = setup();

		await user.type(screen.getByLabelText("買うもの"), "牛");
		await user.keyboard("{Escape}");

		expect(onClose).not.toHaveBeenCalled();

		await user.clear(screen.getByLabelText("買うもの"));
		await user.keyboard("{Escape}");

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("追加できたら「追加しました」、できなければ失敗を、ボタンで伝える", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();

		await user.type(screen.getByLabelText("買うもの"), "牛乳{Enter}");
		expect(
			await screen.findByText("追加しました", { selector: "output" }),
		).toBeInTheDocument();

		onAdd.mockResolvedValueOnce(false);
		await user.type(screen.getByLabelText("買うもの"), "卵{Enter}");
		expect(
			await screen.findByText("失敗しました", { selector: "output" }),
		).toBeInTheDocument();
		// 入力は残る（直してやり直せる）。
		expect(screen.getByLabelText("買うもの")).toHaveValue("卵");
	});

	it("追加の処理中に、もう一度押しても、追加は1回だけ", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();
		let finish: (value: boolean) => void = () => {};

		onAdd.mockImplementationOnce(
			() =>
				new Promise<boolean>((resolve) => {
					finish = resolve;
				}),
		);

		await user.type(screen.getByLabelText("買うもの"), "牛乳");
		await user.click(screen.getByRole("button", { name: /^追加/u }));
		await user.click(screen.getByRole("button", { name: /^追加/u }));
		await user.keyboard("{Enter}");
		finish(true);

		expect(await screen.findByText(/牛乳 1/)).toBeInTheDocument();
		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it("名前を入れると在庫での換算を見せ、「変える」で直した換算で追加する。追加したら、換算の入力も閉じる", async () => {
		const user = userEvent.setup();
		const { onAdd } = setup();

		expect(screen.queryByText("在庫では")).toBeNull();

		await user.type(screen.getByLabelText("買うもの"), "合い挽き肉");
		await user.clear(screen.getByLabelText("単位"));
		await user.type(screen.getByLabelText("単位"), "パック");

		const row = screen.getByText("在庫では").parentElement;

		if (!row) {
			throw new Error("換算の行がない");
		}

		await user.click(within(row).getByRole("button"));

		const amount = screen.getByLabelText("合い挽き肉の1パックあたりの数");

		await user.clear(amount);
		await user.type(amount, "250{Enter}");

		expect(onAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "合い挽き肉",
				inventoryConversion: expect.objectContaining({
					stockUnitCode: "g",
					stockQuantityPerInputUnit: 250,
				}),
			}),
		);
		expect(await screen.findByText(/合い挽き肉 1パック/)).toBeInTheDocument();
		expect(screen.queryByLabelText("合い挽き肉の1パックあたりの数")).toBeNull();
	});

	it("記憶もカタログもない食材は、固定の単位を並べる。選んだ単位が並びにあれば残し、もう一度押すと g ⇄ kg。並びにない単位を書いたら消す。数量の端数・足すボタンは出さない", async () => {
		const user = userEvent.setup();

		setup();

		await user.type(screen.getByLabelText("買うもの"), "謎の食材");

		for (const unit of ["個", "本", "パック", "袋", "g"]) {
			expect(screen.getByRole("button", { name: unit })).toBeInTheDocument();
		}

		await user.click(screen.getByRole("button", { name: "g" }));

		expect(screen.getByLabelText("単位")).toHaveValue("g");
		expect(screen.getByRole("button", { name: "g" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "袋" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "50を足す" })).toBeNull();

		await user.type(screen.getByLabelText("数量"), "{Backspace}1.5");
		await user.click(screen.getByRole("button", { name: "g" }));

		// 打った数は、そのまま。単位だけ kg になる。
		expect(screen.getByLabelText("単位")).toHaveValue("kg");
		expect(screen.getByLabelText("数量")).toHaveValue("1.5");
		expect(screen.getByRole("button", { name: "kg" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await user.clear(screen.getByLabelText("単位"));
		await user.type(screen.getByLabelText("単位"), "缶");

		expect(screen.queryByRole("button", { name: "袋" })).toBeNull();

		await user.clear(screen.getByLabelText("単位"));
		await user.type(screen.getByLabelText("単位"), "本");

		expect(screen.getByRole("button", { name: "袋" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "1/3にする" })).toBeNull();
	});

	it("単位のチップは、前の買い方と別の行に、同じ単位があっても並べ、単位だけを選べる", async () => {
		const user = userEvent.setup();

		render(
			<ShoppingAddSheet
				title="買うものを入れる"
				stores={stores}
				defaultStoreIdFor={() => null}
				onCreateStore={async () => null}
				onAdd={vi.fn(async () => true)}
				onClose={vi.fn()}
				conversionDefaults={{
					"udon-110": {
						nameKey: toConversionDefaultKey("冷凍うどん") ?? "",
						unitLabel: "個",
						inventoryConversion: {
							inputUnitCode: "count",
							stockUnitCode: "count",
							stockUnitLabel: "個",
							stockQuantityPerInputUnit: 1,
							trackingMode: "exact",
						},
						usedAt: 1,
					},
				}}
			/>,
		);

		await user.type(screen.getByLabelText("買うもの"), "冷凍うどん");

		const remembered = screen.getByRole("group", {
			name: "前の買い方・よく使う数量",
		});
		const units = screen.getByRole("group", { name: "よく使う単位" });

		expect(
			within(remembered).getByRole("button", { name: "1個" }),
		).toBeInTheDocument();
		// 名前で埋まった「個」は、単位の行でも押した状態。
		expect(within(units).getByRole("button", { name: "個" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(within(remembered).queryByRole("button", { name: "個" })).toBeNull();

		await user.clear(screen.getByLabelText("数量"));
		await user.type(screen.getByLabelText("数量"), "3");
		await user.click(within(units).getByRole("button", { name: "本" }));

		// 打った数はそのまま、単位だけが変わる。
		expect(screen.getByLabelText("数量")).toHaveValue("3");
		expect(screen.getByLabelText("単位")).toHaveValue("本");
	});

	it("知らない名前には「もしかして」を出し、［〇〇にする］で名前を置き換える", async () => {
		const user = userEvent.setup();

		setup();
		await user.type(screen.getByLabelText("買うもの"), "鶏むね");
		await user.click(screen.getByRole("button", { name: "鶏むね肉にする" }));

		expect(screen.getByLabelText("買うもの")).toHaveValue("鶏むね肉");
		expect(screen.queryByText(/もしかして/u)).toBeNull();
	});
});
