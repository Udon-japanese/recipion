import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DishPlacement } from "../domain/dish-cover";
import { findDishPart } from "../domain/dish-part";
import { dishPartCategories } from "../domain/dish-part-category";
import { DishArtEditor } from "./dish-art-editor";

// 主な入力が、指（coarse）か、マウス（fine）か。
function mockPointer(coarse: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: coarse && query.includes("pointer: coarse"),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

// 値は、呼び出し側が持つ（本物の使い方と同じ）。空から始めると「セット」が開くので、「パーツ」に切り替える。
function Harness() {
	const [placements, setPlacements] = useState<DishPlacement[]>([]);

	return (
		<>
			<DishArtEditor placements={placements} onChange={setPlacements} />
			<output data-testid="count">{placements.length}</output>
		</>
	);
}

// 棚の最初の部品を押して置く（置いた部品が、選んだ状態になる）。
// 棚の部品は、押し始め（pointerdown）でマウスの運びを始めるので、jsdom では click だけを送る。
async function placeFirstPart(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "パーツ" }));

	const firstPart = findDishPart(dishPartCategories[0]?.partIds[0] ?? "");

	if (!firstPart) throw new Error("棚の部品がありません");

	fireEvent.click(screen.getByRole("button", { name: firstPart.label }));
}

function deleteHandle() {
	return document.querySelector('[data-handle="delete"]');
}

describe("DishArtEditor：選んだ部品を消す", () => {
	it("指で操作する端末では、絵の上に「×」を出さず、道具の列の「この部品を消す」で消す", async () => {
		mockPointer(true);
		const user = userEvent.setup();

		render(<Harness />);
		await placeFirstPart(user);

		expect(screen.getByTestId("count")).toHaveTextContent("1");
		expect(deleteHandle()).toBeNull();

		await user.click(screen.getByRole("button", { name: "この部品を消す" }));

		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("マウスの端末では、絵の上の「×」も出す", async () => {
		mockPointer(false);
		const user = userEvent.setup();

		render(<Harness />);
		await placeFirstPart(user);

		expect(deleteHandle()).not.toBeNull();
		expect(
			screen.getByRole("button", { name: "この部品を消す" }),
		).toBeEnabled();
	});

	it("部品を選んでいなければ、「この部品を消す」は押せない", () => {
		mockPointer(true);

		render(<Harness />);

		expect(
			screen.getByRole("button", { name: "この部品を消す" }),
		).toBeDisabled();
	});
});

describe("DishArtEditor：棚の部品を探す", () => {
	it("打つと分類のタブを隠して全分類から探し、押すと置ける。空に戻すと、分類に戻る", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "パーツ" }));

		const firstCategory = dishPartCategories[0];

		if (!firstCategory) throw new Error("分類がありません");

		await user.type(
			screen.getByRole("searchbox", { name: "部品を探す" }),
			"からあげ",
		);

		expect(
			screen.queryByRole("button", { name: firstCategory.label }),
		).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "唐揚げ" }));
		expect(screen.getByTestId("count")).toHaveTextContent("1");

		await user.clear(screen.getByRole("searchbox", { name: "部品を探す" }));

		expect(
			screen.getByRole("button", { name: firstCategory.label }),
		).toBeVisible();
	});

	it("見つからなければ、そう伝える", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "パーツ" }));
		await user.type(
			screen.getByRole("searchbox", { name: "部品を探す" }),
			"存在しない部品",
		);

		expect(screen.getByText(/見つかりませんでした/u)).toBeVisible();
	});
});

// 部品を置いた状態から始める（キー操作の確かめ用）。外側の keydown を受けて、Esc が外へ伝わったかを見る。
function KeyHarness({
	initial,
	onOuterKeyDown = () => {},
}: {
	initial: DishPlacement[];
	onOuterKeyDown?: (key: string) => void;
}) {
	const [placements, setPlacements] = useState<DishPlacement[]>(initial);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: モーダルの Esc の受け方をまねる、テスト用の外枠
		<div onKeyDown={(event) => onOuterKeyDown(event.key)}>
			<DishArtEditor placements={placements} onChange={setPlacements} />
			<output data-testid="placements">{JSON.stringify(placements)}</output>
		</div>
	);
}

const rice: DishPlacement = { partId: "rice", x: 20, y: 20, scale: 0.5 };
const tofu: DishPlacement = { partId: "tofu", x: 40, y: 40, scale: 0.5 };
const natto: DishPlacement = { partId: "natto", x: 60, y: 60, scale: 0.5 };

function placementsNow(): DishPlacement[] {
	return JSON.parse(screen.getByTestId("placements").textContent ?? "[]");
}

function partOrder() {
	return placementsNow().map((placement) => placement.partId);
}

async function focusCanvas(user: ReturnType<typeof userEvent.setup>) {
	await user.click(screen.getByRole("button", { name: "パーツ" }));
	screen.getByRole("application").focus();
}

function adjustTitle() {
	return screen.getByRole("heading", { name: /を調整$/u }).textContent;
}

describe("DishArtEditor：キー操作", () => {
	it("N で次、Shift+N で前の部品を選ぶ（端では反対の端へ戻る）", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice, tofu]} />);
		await focusCanvas(user);

		expect(adjustTitle()).toBe("選んだ部品を調整");
		await user.keyboard("n");
		expect(adjustTitle()).toBe("ご飯を調整");
		await user.keyboard("n");
		expect(adjustTitle()).toBe("豆腐を調整");
		await user.keyboard("n");
		expect(adjustTitle()).toBe("ご飯を調整");
		await user.keyboard("{Shift>}N{/Shift}");
		expect(adjustTitle()).toBe("豆腐を調整");
	});

	it("] [ で1つずつ、Shift+] Shift+[ で端まで、重なり順を変える。Ctrl+Z で戻せる", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice, tofu, natto]} />);
		await focusCanvas(user);
		await user.keyboard("n");

		await user.keyboard("]");
		expect(partOrder()).toEqual(["tofu", "rice", "natto"]);
		await user.keyboard("}");
		expect(partOrder()).toEqual(["tofu", "natto", "rice"]);
		await user.keyboard("{{");
		expect(partOrder()).toEqual(["rice", "tofu", "natto"]);
		// もう奥の端なので、変わらない。
		await user.keyboard("[[");
		expect(partOrder()).toEqual(["rice", "tofu", "natto"]);

		await user.keyboard("{Control>}z{/Control}");
		expect(partOrder()).toEqual(["tofu", "natto", "rice"]);
	});

	it("Ctrl+D で複製し、複製したものを選ぶ。R・Shift+R で回し、H で反転する", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice]} />);
		await focusCanvas(user);
		await user.keyboard("n");

		await user.keyboard("{Control>}d{/Control}");
		expect(placementsNow()).toHaveLength(2);

		await user.keyboard("r");
		expect(placementsNow()[1]?.rotate).toBe(90);
		await user.keyboard("{Shift>}R{/Shift}");
		expect(placementsNow()[1]?.rotate ?? 0).toBe(0);
		await user.keyboard("h");
		expect(placementsNow()[1]?.flip).toBe(true);
		// 元の部品は変わらない。
		expect(placementsNow()[0]).toEqual(rice);
	});

	it("Esc は、選んでいるときは選択を外すだけ（外へ伝えない）。選んでいなければ、外へ伝える", async () => {
		const user = userEvent.setup();
		const onOuterKeyDown = vi.fn();

		render(<KeyHarness initial={[rice]} onOuterKeyDown={onOuterKeyDown} />);
		await focusCanvas(user);
		await user.keyboard("n");
		onOuterKeyDown.mockClear();

		await user.keyboard("{Escape}");
		expect(adjustTitle()).toBe("選んだ部品を調整");
		expect(onOuterKeyDown).not.toHaveBeenCalledWith("Escape");

		await user.keyboard("{Escape}");
		expect(onOuterKeyDown).toHaveBeenCalledWith("Escape");
	});

	it("検索の欄で N と打っても、部品は選ばれない", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice]} />);
		await user.click(screen.getByRole("button", { name: "パーツ" }));
		await user.type(screen.getByRole("searchbox", { name: "部品を探す" }), "n");

		expect(adjustTitle()).toBe("選んだ部品を調整");
	});

	it("+ と、Shift なしの = で大きくする。JIS 配列の Shift+-（=）では大きくしない", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice]} />);
		await focusCanvas(user);
		await user.keyboard("n");

		await user.keyboard("{Shift>}={/Shift}");
		expect(placementsNow()[0]?.scale).toBe(rice.scale);

		await user.keyboard("=");
		const enlarged = placementsNow()[0]?.scale ?? 0;
		// rice の大きさは 0.5。
		expect(enlarged).toBeGreaterThan(0.5);

		await user.keyboard("+");
		expect(placementsNow()[0]?.scale ?? 0).toBeGreaterThan(enlarged);
	});

	it("キー操作の一覧は、OS に合わせた表記（Windows なら Ctrl）のキーで出す", async () => {
		const user = userEvent.setup();

		render(<KeyHarness initial={[rice]} />);
		await user.click(screen.getByRole("button", { name: "パーツ" }));
		await user.click(screen.getByText("キー操作"));

		const keys = [...document.querySelectorAll("kbd")].map(
			(key) => key.textContent,
		);

		expect(keys).toEqual(
			expect.arrayContaining(["Ctrl", "D", "Delete", "Esc", "Shift"]),
		);
		expect(keys).not.toContain("Command");
	});
});
