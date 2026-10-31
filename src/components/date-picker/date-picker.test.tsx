import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DateField } from "./date-picker";

const today = "2026-10-31";

function mockCompact(compact: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: compact && query.includes("max-width"),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

// 値は、呼び出し側が持つ（本物の使い方と同じ）。
function Harness({
	initial = "",
	onChange,
}: {
	initial?: string;
	onChange?: (value: string) => void;
}) {
	const [value, setValue] = useState(initial);

	return (
		<DateField
			aria-label="期限"
			value={value}
			today={today}
			onChange={(next) => {
				setValue(next);
				onChange?.(next);
			}}
		/>
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("DateField（PC）", () => {
	it("打った日付を、欄から出たときに確定する（年を省くと、今日の年）", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness onChange={onChange} />);

		await user.type(screen.getByLabelText("期限"), "11/2");
		await user.tab();

		expect(onChange).toHaveBeenCalledWith("2026-11-02");
		expect(screen.getByLabelText("期限")).toHaveValue("2026/11/02");
	});

	it("読めない日付は、確定せず、直すよう示す。欄を空にすると、日付なしになる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness initial="2026-11-02" onChange={onChange} />);

		const input = screen.getByLabelText("期限");

		await user.clear(input);
		await user.type(input, "2026/2/30");
		await user.tab();

		expect(await screen.findByRole("alert")).toHaveTextContent("日付を確認");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(onChange).not.toHaveBeenCalled();

		await user.clear(input);
		await user.tab();

		expect(onChange).toHaveBeenCalledWith("");
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("カレンダーを開いて、日を選ぶ。選んだ日は、欄に入る", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness initial="2026-11-02" onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));

		const calendar = await screen.findByRole("dialog", { name: "カレンダー" });

		expect(
			within(calendar).getByRole("button", { name: "前の月" }),
		).toBeInTheDocument();
		expect(
			within(calendar).getByRole("button", { name: "2026年11月2日 月曜日" }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(
			within(calendar).getByRole("button", { name: "2026年11月15日 日曜日" }),
		);

		expect(onChange).toHaveBeenCalledWith("2026-11-15");
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByLabelText("期限")).toHaveValue("2026/11/15");
	});

	it("カレンダーの「今日」と「消す」", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness initial="2026-11-02" onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
		await user.click(await screen.findByRole("button", { name: "今日" }));

		expect(onChange).toHaveBeenLastCalledWith("2026-10-31");

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
		await user.click(await screen.findByRole("button", { name: "消す" }));

		expect(onChange).toHaveBeenLastCalledWith("");
		expect(screen.getByLabelText("期限")).toHaveValue("");
	});

	it("月を動かす。題を押すと、年と月を選べる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness initial="2026-11-02" onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
		await user.click(await screen.findByRole("button", { name: "次の月" }));

		expect(
			screen.getByRole("button", { name: "2026年12月25日 金曜日" }),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "2026年12月。年と月を選ぶ" }),
		);
		await user.click(screen.getByRole("button", { name: "次の年" }));
		await user.click(screen.getByRole("button", { name: "3月" }));

		await user.click(
			await screen.findByRole("button", { name: "2027年3月10日 水曜日" }),
		);

		expect(onChange).toHaveBeenCalledWith("2027-03-10");
	});

	it("キーボードで、日を動いて選び、Esc で閉じる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness initial="2026-11-02" onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));

		const start = await screen.findByRole("button", {
			name: "2026年11月2日 月曜日",
		});

		await waitFor(() => expect(start).toHaveFocus());

		await user.keyboard("{ArrowRight}{ArrowDown}");
		await user.keyboard("{Enter}");

		// 11/2 → 11/3 → 11/10
		expect(onChange).toHaveBeenCalledWith("2026-11-10");

		await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
		await screen.findByRole("dialog", { name: "カレンダー" });
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByLabelText("期限")).toHaveFocus();
	});
});

describe("DateField（スマホ）", () => {
	it("欄を押すと、シートでカレンダーが開き、日を選ぶと閉じる", async () => {
		mockCompact(true);

		const user = userEvent.setup();
		const onChange = vi.fn();

		render(<Harness onChange={onChange} />);

		const trigger = screen.getByRole("button", { name: "期限" });

		expect(trigger).toHaveTextContent("日付を選ぶ");

		await user.click(trigger);
		await user.click(
			await screen.findByRole("button", { name: "2026年10月31日 土曜日" }),
		);

		expect(onChange).toHaveBeenCalledWith("2026-10-31");
		await waitFor(() => expect(screen.queryByText("日付を選ぶ")).toBeNull());
		expect(screen.getByRole("button", { name: "期限" })).toHaveTextContent(
			"2026/10/31",
		);
	});
});
