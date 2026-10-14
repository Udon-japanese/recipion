import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "./sheet";

function Harness({
	dismissible = true,
	onChange,
}: {
	dismissible?: boolean;
	onChange?: (open: boolean) => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				開く
			</button>
			<Sheet
				open={open}
				onOpenChange={(next) => {
					onChange?.(next);
					setOpen(next);
				}}
				title="在庫に追加"
				dismissible={dismissible}
				footer={<button type="button">追加</button>}
			>
				<input aria-label="食材名" />
			</Sheet>
		</>
	);
}

beforeEach(() => {
	document.body.style.overflow = "";
});

afterEach(() => {
	vi.useRealTimers();
});

describe("Sheet", () => {
	it("閉じているときは、何も出さない", () => {
		render(<Harness />);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("開くと、名前つきのモーダルになり、フォーカスが中へ移り、背景は操作できず、スクロールもロックされる", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "開く" }));

		const dialog = screen.getByRole("dialog", { name: "在庫に追加" });

		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveFocus();
		expect(document.body.style.overflow).toBe("hidden");
		// 背景（アプリの本体）は、inert になる。シート自身は、ならない。
		expect(
			screen
				.getByRole("button", { name: "開く", hidden: true })
				.closest("[inert]"),
		).not.toBeNull();
		expect(dialog.closest("[inert]")).toBeNull();
	});

	it("Esc で閉じる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness onChange={onChange} />);
		await user.click(screen.getByRole("button", { name: "開く" }));
		await user.keyboard("{Escape}");

		expect(onChange).toHaveBeenLastCalledWith(false);
	});

	it("閉じるボタンで閉じる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness onChange={onChange} />);
		await user.click(screen.getByRole("button", { name: "開く" }));
		await user.click(screen.getByRole("button", { name: "閉じる" }));

		expect(onChange).toHaveBeenLastCalledWith(false);
	});

	it("暗幕を押すと閉じる。閉じられないシートは、閉じない", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { unmount } = render(<Harness onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "開く" }));
		const scrim = document.querySelector<HTMLElement>(
			'[aria-hidden="true"][class*="scrim"]',
		);

		expect(scrim).not.toBeNull();
		await user.click(scrim as HTMLElement);
		expect(onChange).toHaveBeenLastCalledWith(false);
		unmount();

		const guarded = vi.fn();

		render(<Harness dismissible={false} onChange={guarded} />);
		await user.click(screen.getByRole("button", { name: "開く" }));
		await user.keyboard("{Escape}");
		await user.click(
			document.querySelector<HTMLElement>(
				'[aria-hidden="true"][class*="scrim"]',
			) as HTMLElement,
		);

		expect(guarded).not.toHaveBeenCalled();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("Tab は、シートの中で一周する", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "開く" }));

		const close = screen.getByRole("button", { name: "閉じる" });
		const input = screen.getByRole("textbox", { name: "食材名" });
		const add = screen.getByRole("button", { name: "追加" });

		close.focus();
		await user.tab();
		expect(input).toHaveFocus();
		await user.tab();
		expect(add).toHaveFocus();
		await user.tab();
		expect(close).toHaveFocus();
		await user.tab({ shift: true });
		expect(add).toHaveFocus();
	});

	it("閉じたあと、少し待って消え、背景とスクロールが戻り、フォーカスは、押したボタンへ戻る", async () => {
		const user = userEvent.setup();

		render(<Harness />);

		const opener = screen.getByRole("button", { name: "開く" });

		await user.click(opener);
		await user.keyboard("{Escape}");

		// 閉じる動きが終わるまで、少し残る。
		expect(screen.queryByRole("dialog")).toBeInTheDocument();

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 600));
		});

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(document.body.style.overflow).toBe("");
		expect(document.querySelector("[inert]")).toBeNull();
		expect(opener).toHaveFocus();
	});

	it("下に固定の操作バー（footer）を出す", async () => {
		const user = userEvent.setup();

		render(<Harness />);
		await user.click(screen.getByRole("button", { name: "開く" }));

		expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
	});
});
