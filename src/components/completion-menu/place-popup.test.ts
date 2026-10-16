import { describe, expect, it } from "vitest";
import { placePopup } from "./place-popup";

const viewport = { width: 800, height: 600 };
const popup = { width: 200, height: 120 };

describe("placePopup", () => {
	it("下に入るときは、下に置く。カーソルの行には重ねない", () => {
		const caret = { top: 100, left: 50, height: 24 };
		const placed = placePopup({
			caret,
			popup,
			viewport,
			prefer: "below",
		});

		expect(placed).toEqual({ side: "below", top: 128, left: 50 });
		expect(placed.top).toBeGreaterThanOrEqual(caret.top + caret.height);
	});

	it("上を先にしたいときは、上に入れば、上に置く（IME の変換候補の窓と重ねない）", () => {
		const caret = { top: 300, left: 50, height: 24 };
		const placed = placePopup({
			caret,
			popup,
			viewport,
			prefer: "above",
		});

		expect(placed).toEqual({ side: "above", top: 176, left: 50 });
		expect(placed.top + popup.height).toBeLessThanOrEqual(caret.top);
	});

	it("先にしたい側に入らなければ、反対側に置く", () => {
		const nearBottom = { top: 560, left: 50, height: 24 };
		const nearTop = { top: 20, left: 50, height: 24 };

		expect(
			placePopup({ caret: nearBottom, popup, viewport, prefer: "below" }).side,
		).toBe("above");
		expect(
			placePopup({ caret: nearTop, popup, viewport, prefer: "above" }).side,
		).toBe("below");
	});

	it("どちらにも入らないときは、広い側に置く", () => {
		const small = { width: 800, height: 150 };

		expect(
			placePopup({
				caret: { top: 100, left: 0, height: 24 },
				popup,
				viewport: small,
				prefer: "above",
			}).side,
		).toBe("above");
		expect(
			placePopup({
				caret: { top: 20, left: 0, height: 24 },
				popup,
				viewport: small,
				prefer: "above",
			}).side,
		).toBe("below");
	});

	it("横は、画面の内に収める", () => {
		const caret = { top: 100, left: 780, height: 24 };

		expect(placePopup({ caret, popup, viewport, prefer: "below" }).left).toBe(
			592,
		);
		expect(
			placePopup({
				caret: { top: 100, left: -30, height: 24 },
				popup,
				viewport,
				prefer: "below",
			}).left,
		).toBe(8);
	});

	it("上を先にしたいのに入らなくても、余白が十分なら、縮めて上に置く（下に置くと IME の窓に重なる）", () => {
		const caret = { top: 140, left: 50, height: 24 };
		const placed = placePopup({
			caret,
			popup: { width: 200, height: 170 },
			viewport,
			prefer: "above",
		});

		expect(placed.side).toBe("above");
		expect(placed.maxHeight).toBe(128);
		expect(placed.top + (placed.maxHeight ?? 0)).toBeLessThanOrEqual(caret.top);
	});

	it("上の余白が小さすぎるときは、縮めずに、下に置く", () => {
		const placed = placePopup({
			caret: { top: 60, left: 50, height: 24 },
			popup: { width: 200, height: 170 },
			viewport,
			prefer: "above",
		});

		expect(placed.side).toBe("below");
		expect(placed.maxHeight).toBeUndefined();
	});
});
