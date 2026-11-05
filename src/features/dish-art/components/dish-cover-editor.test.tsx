import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DishPlacement } from "../domain/dish-cover";
import { findDishPart } from "../domain/dish-part";
import { dishPartCategories } from "../domain/dish-part-category";
import { DishCoverEditor } from "./dish-cover-editor";

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
			<DishCoverEditor placements={placements} onChange={setPlacements} />
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

describe("DishCoverEditor：選んだ部品を消す", () => {
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
