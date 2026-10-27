import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox/checkbox";
import { Chip, ChipGroup } from "./chip/chip";
import { Field, TextInput } from "./field/field";
import { IconButton } from "./icon-button/icon-button";
import { Note } from "./note/note";
import { SegmentedControl } from "./segmented-control/segmented-control";
import { Tag } from "./tag/tag";
import { Toast } from "./toast/toast";

describe("IconButton", () => {
	it("名前（label）で探せて、押せる。無効なら、押せない", async () => {
		const onClick = vi.fn();

		render(
			<>
				<IconButton icon="edit" label="編集" onClick={onClick} />
				<IconButton icon="trash" label="削除" disabled onClick={onClick} />
			</>,
		);

		await userEvent.click(screen.getByRole("button", { name: "編集" }));
		await userEvent.click(screen.getByRole("button", { name: "削除" }));

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

function Demo() {
	const [value, setValue] = useState("3日");

	return (
		<ChipGroup label="期限">
			{["3日", "1週間"].map((label) => (
				<Chip
					key={label}
					pressed={value === label}
					onClick={() => setValue(label)}
				>
					{label}
				</Chip>
			))}
		</ChipGroup>
	);
}

describe("Chip", () => {
	it("選べるチップは、選ばれているかを aria-pressed で伝える", async () => {
		render(<Demo />);

		expect(screen.getByRole("button", { name: "3日" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await userEvent.click(screen.getByRole("button", { name: "1週間" }));

		expect(screen.getByRole("button", { name: "1週間" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "3日" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByRole("group", { name: "期限" })).toBeInTheDocument();
	});

	it("pressed を渡さなければ、ふつうのボタン（aria-pressed なし）", () => {
		render(<Chip>日付</Chip>);

		expect(screen.getByRole("button", { name: "日付" })).not.toHaveAttribute(
			"aria-pressed",
		);
	});
});

describe("Field", () => {
	it("ラベルと欄を結びつけ、補足とエラーを欄に結びつける", () => {
		render(
			<Field
				label="メールアドレス"
				hint="コードを送ります"
				error="入力してください"
			>
				{(control) => <TextInput {...control} />}
			</Field>,
		);

		const input = screen.getByLabelText("メールアドレス");

		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAccessibleDescription(
			"入力してください コードを送ります",
		);
		expect(screen.getByRole("alert")).toHaveTextContent("入力してください");
	});

	it("エラーがなければ、aria-invalid を付けない", () => {
		render(
			<Field label="食材名">{(control) => <TextInput {...control} />}</Field>,
		);

		expect(screen.getByLabelText("食材名")).not.toHaveAttribute("aria-invalid");
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});

describe("Checkbox", () => {
	it("名前で探せて、押すと切り替わる", async () => {
		const onChange = vi.fn();

		render(<Checkbox label="トマトをチェック" onChange={onChange} />);
		await userEvent.click(
			screen.getByRole("checkbox", { name: "トマトをチェック" }),
		);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(
			screen.getByRole("checkbox", { name: "トマトをチェック" }),
		).toBeChecked();
	});
});

describe("SegmentedControl", () => {
	it("選ばれているものが分かり、押すと変わる", async () => {
		const onChange = vi.fn();

		render(
			<SegmentedControl
				label="表示の切り替え"
				value="list"
				onChange={onChange}
				options={[
					{ value: "list", label: "一覧" },
					{ value: "store", label: "店ごと" },
				]}
			/>,
		);

		expect(screen.getByRole("button", { name: "一覧" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await userEvent.click(screen.getByRole("button", { name: "店ごと" }));

		expect(onChange).toHaveBeenCalledWith("store");
	});
});

describe("Note・Tag・Toast", () => {
	it("エラーのお知らせは alert、そのほかは status として読み上げられる", () => {
		render(
			<>
				<Note tone="error">読み込めませんでした</Note>
				<Note tone="success">反映しました</Note>
			</>,
		);

		expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
		expect(screen.getByRole("status")).toHaveTextContent("反映しました");
	});

	it("お知らせに、右の操作を置ける", async () => {
		const onRetry = vi.fn();

		render(
			<Note
				tone="warn"
				action={
					<button type="button" onClick={onRetry}>
						再試行
					</button>
				}
			>
				未反映です
			</Note>,
		);
		await userEvent.click(screen.getByRole("button", { name: "再試行" }));

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("タグは、押せない（ボタンではない）", () => {
		render(
			<Tag tone="warn" icon="clock">
				明日
			</Tag>,
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByText("明日")).toBeInTheDocument();
	});

	it("トーストの「元に戻す」を押せる", async () => {
		const onUndo = vi.fn();

		render(
			<Toast action={{ label: "元に戻す", onClick: onUndo }}>
				在庫から引きました
			</Toast>,
		);
		await userEvent.click(screen.getByRole("button", { name: "元に戻す" }));

		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("status")).toHaveTextContent("在庫から引きました");
	});
});
