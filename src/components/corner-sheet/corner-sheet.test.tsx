import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CornerSheet } from "./corner-sheet";

function setup(onDismiss?: () => void) {
	const onUndo = vi.fn();
	const onClose = vi.fn();

	render(
		<CornerSheet
			open
			title="在庫から3件を引きました"
			onDismiss={onDismiss}
			left={{ label: "元に戻す", icon: "undo", onClick: onUndo }}
			right={{ label: "閉じる", icon: "check", onClick: onClose }}
		>
			<p>本文</p>
		</CornerSheet>,
	);

	return { onUndo, onClose };
}

describe("CornerSheet", () => {
	it("左を省略すると、「元に戻す」は出ない", () => {
		render(
			<CornerSheet
				open
				title="元に戻しました"
				right={{ label: "閉じる", icon: "check", onClick: vi.fn() }}
			>
				<p>本文</p>
			</CornerSheet>,
		);

		expect(screen.queryByRole("button", { name: "元に戻す" })).toBeNull();
		expect(screen.getByRole("button", { name: "閉じる" })).toBeVisible();
	});

	it("Esc と暗幕は、onDismiss だけを呼ぶ（左のボタンの操作は、呼ばない）", async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();
		const { onUndo } = setup(onDismiss);

		await user.keyboard("{Escape}");
		await user.click(
			document.querySelector('[aria-hidden="true"]') as HTMLElement,
		);

		expect(onDismiss).toHaveBeenCalledTimes(2);
		expect(onUndo).not.toHaveBeenCalled();
	});

	it("onDismiss がなければ、Esc も暗幕も、何も起こさない", async () => {
		const user = userEvent.setup();
		const { onUndo, onClose } = setup();

		await user.keyboard("{Escape}");

		expect(onUndo).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("左右のボタンは、それぞれの操作を呼ぶ", async () => {
		const user = userEvent.setup();
		const { onUndo, onClose } = setup();

		await user.click(screen.getByRole("button", { name: "元に戻す" }));
		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
