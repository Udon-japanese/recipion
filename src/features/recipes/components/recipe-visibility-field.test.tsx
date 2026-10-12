import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecipeVisibilityField } from "./recipe-visibility-field";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

describe("RecipeVisibilityField", () => {
	it("全体公開を選ぶと、同意の文とプロフィールへのリンクが出る。非公開では出ない", () => {
		const { rerender } = render(
			<RecipeVisibilityField
				value="private"
				onChange={vi.fn()}
				hasSourceUrl={false}
			/>,
		);

		expect(screen.queryByText(/自分の言葉で書いた/u)).toBeNull();

		rerender(
			<RecipeVisibilityField
				value="public"
				onChange={vi.fn()}
				hasSourceUrl={false}
			/>,
		);

		expect(screen.getByText(/自分の言葉で書いた/u)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "プロフィール" })).toHaveAttribute(
			"href",
			"/profile",
		);
	});

	it("限定公開を選ぶと、パスフレーズの説明と同意の文が出る", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		const { rerender } = render(
			<RecipeVisibilityField
				value="private"
				onChange={onChange}
				hasSourceUrl={false}
			/>,
		);

		await user.click(screen.getByLabelText(/限定公開/u));

		expect(onChange).toHaveBeenCalledWith("unlisted");

		rerender(
			<RecipeVisibilityField
				value="unlisted"
				onChange={onChange}
				hasSourceUrl={false}
			/>,
		);

		expect(screen.getByText(/パスフレーズは、保存すると/u)).toBeInTheDocument();
		expect(screen.getByText(/自分の言葉で書いた/u)).toBeInTheDocument();
	});

	it("選択を知らせる。引用元のURLがあるときは、全体公開を選べない", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		const { rerender } = render(
			<RecipeVisibilityField
				value="private"
				onChange={onChange}
				hasSourceUrl={false}
			/>,
		);

		await user.click(screen.getByLabelText(/全体公開/u));

		expect(onChange).toHaveBeenCalledWith("public");

		rerender(
			<RecipeVisibilityField
				value="private"
				onChange={onChange}
				hasSourceUrl
			/>,
		);

		expect(screen.getByLabelText(/全体公開/u)).toBeDisabled();
		expect(screen.getByLabelText(/限定公開/u)).toBeDisabled();
		expect(screen.getByText(/公開できません/u)).toBeInTheDocument();
	});
});
