import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingPanel } from "./floating-panel";

function setup(anchor: { top: number | null }) {
	const onMove = vi.fn();

	render(
		<FloatingPanel
			title="卵"
			getInitialPosition={() => ({ x: 100, y: 200 })}
			followTop={() => anchor.top}
			onMove={onMove}
			onEscape={() => {}}
			onClose={() => {}}
		>
			中身
		</FloatingPanel>,
	);

	return {
		onMove,
		panel: () => screen.getByRole("complementary", { name: "卵" }),
	};
}

describe("FloatingPanel（開いた元の行を追いかける）", () => {
	it("スクロールすると、行の高さへ動き、横の位置はそのまま。画面の上端で止まる", () => {
		const anchor: { top: number | null } = { top: 200 };
		const { onMove, panel } = setup(anchor);

		anchor.top = 120;
		fireEvent.scroll(window);

		expect(panel()).toHaveStyle({ left: "100px", top: "120px" });
		expect(onMove).toHaveBeenLastCalledWith({ x: 100, y: 120 });

		anchor.top = -300;
		fireEvent.scroll(window);

		expect(panel()).toHaveStyle({ top: "8px" });
	});

	it("行が見つからないときは、動かさない", () => {
		const anchor: { top: number | null } = { top: 200 };
		const { onMove, panel } = setup(anchor);

		anchor.top = null;
		fireEvent.scroll(window);

		expect(panel()).toHaveStyle({ top: "200px" });
		expect(onMove).not.toHaveBeenCalled();
	});

	it("自分で動かしたあとは、スクロールしても追いかけない", () => {
		const anchor: { top: number | null } = { top: 200 };
		const { panel } = setup(anchor);

		fireEvent.keyDown(screen.getByRole("heading", { name: "卵" }), {
			key: "ArrowDown",
			altKey: true,
		});
		expect(panel()).toHaveStyle({ top: "224px" });

		anchor.top = 120;
		fireEvent.scroll(window);

		expect(panel()).toHaveStyle({ top: "224px" });
	});
});
