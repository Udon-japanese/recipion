import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Menu } from "./menu";

function renderMenu(onEdit = vi.fn(), onRemove = vi.fn()) {
	render(
		<>
			<Menu
				label="卵のその他"
				icon="more-horizontal"
				items={[
					{ label: "編集", onSelect: onEdit },
					{ label: "上へ", disabled: true, onSelect: vi.fn() },
					{ label: "削除", tone: "danger", onSelect: onRemove },
				]}
			/>
			<p>外側</p>
		</>,
	);
}

describe("Menu", () => {
	it("開くと最初の項目にフォーカスが移り、選ぶと実行して閉じ、ボタンへ戻る", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();

		renderMenu(onEdit);

		const trigger = screen.getByRole("button", { name: "卵のその他" });

		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus();

		await user.click(screen.getByRole("menuitem", { name: "編集" }));

		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).toBeNull();
		expect(trigger).toHaveFocus();
	});

	it("矢印で選べない項目を飛ばして動き、選べない項目は実行されない", async () => {
		const user = userEvent.setup();
		const onRemove = vi.fn();

		renderMenu(vi.fn(), onRemove);
		await user.click(screen.getByRole("button", { name: "卵のその他" }));

		await user.keyboard("{ArrowDown}");

		expect(screen.getByRole("menuitem", { name: "削除" })).toHaveFocus();

		await user.keyboard("{ArrowDown}");

		expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus();

		await user.click(screen.getByRole("menuitem", { name: "上へ" }));

		expect(screen.getByRole("menu")).toBeInTheDocument();
	});

	it("Esc でボタンへ戻って閉じ、外を押しても閉じる", async () => {
		const user = userEvent.setup();

		renderMenu();

		const trigger = screen.getByRole("button", { name: "卵のその他" });

		await user.click(trigger);
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("menu")).toBeNull();
		expect(trigger).toHaveFocus();

		await user.click(trigger);
		await user.click(screen.getByText("外側"));

		expect(screen.queryByRole("menu")).toBeNull();
	});

	describe("下の階層", () => {
		function renderSubmenu(onChoose = vi.fn()) {
			render(
				<Menu
					label="醤油のその他"
					icon="more-horizontal"
					items={[
						{
							label: "量を変えたときの増減",
							detail: "通常",
							submenu: {
								title: "量を変えたときの増減",
								items: [
									{ label: "通常", checked: true, onSelect: vi.fn() },
									{
										label: "やや控えめ",
										checked: false,
										onSelect: () => onChoose("やや控えめ"),
									},
								],
							},
						},
						{ label: "削除", tone: "danger", onSelect: vi.fn() },
					]}
				/>,
			);
		}

		it("選ぶと、同じ枠の中身が見出しと選択肢に替わり、選んでいる選択肢にフォーカスが移る。選ぶと実行して閉じる", async () => {
			const user = userEvent.setup();
			const onChoose = vi.fn();

			renderSubmenu(onChoose);
			await user.click(screen.getByRole("button", { name: "醤油のその他" }));
			await user.click(
				screen.getByRole("menuitem", { name: /量を変えたときの増減/u }),
			);

			expect(screen.getByText("量を変えたときの増減")).toBeInTheDocument();
			expect(screen.queryByRole("menuitem", { name: "削除" })).toBeNull();
			expect(screen.getByRole("menuitemradio", { name: "通常" })).toHaveFocus();
			expect(
				screen.getByRole("menuitemradio", { name: "通常" }),
			).toHaveAttribute("aria-checked", "true");

			await user.click(
				screen.getByRole("menuitemradio", { name: "やや控えめ" }),
			);

			expect(onChoose).toHaveBeenCalledWith("やや控えめ");
			expect(screen.queryByRole("menu")).toBeNull();
		});

		it("戻る・Esc で上の階層へ戻り、もう一度 Esc で閉じる", async () => {
			const user = userEvent.setup();

			renderSubmenu();
			await user.click(screen.getByRole("button", { name: "醤油のその他" }));
			await user.click(
				screen.getByRole("menuitem", { name: /量を変えたときの増減/u }),
			);
			await user.click(screen.getByRole("button", { name: "戻る" }));

			expect(
				screen.getByRole("menuitem", { name: "削除" }),
			).toBeInTheDocument();

			await user.keyboard("{ArrowRight}");

			expect(screen.getByRole("menuitemradio", { name: "通常" })).toHaveFocus();

			await user.keyboard("{Escape}");

			expect(
				screen.getByRole("menuitem", { name: "削除" }),
			).toBeInTheDocument();

			await user.keyboard("{Escape}");

			expect(screen.queryByRole("menu")).toBeNull();
		});
	});
});
