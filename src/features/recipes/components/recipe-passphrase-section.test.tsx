import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecipePassphraseSection } from "./recipe-passphrase-section";

describe("RecipePassphraseSection", () => {
	it("パスフレーズを表示する。作り直しは、確認の2段階", async () => {
		const user = userEvent.setup();
		const regeneratePassphrase = vi.fn(async () => "あたらしいぱすふれーず");

		render(
			<RecipePassphraseSection
				loadPassphrase={async () => "ねこりんごやまくるま"}
				regeneratePassphrase={regeneratePassphrase}
			/>,
		);

		expect(await screen.findByText("ねこりんごやまくるま")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "作り直す" }));

		expect(regeneratePassphrase).not.toHaveBeenCalled();

		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText(/新しいパスフレーズを入れないと/u),
		).toBeInTheDocument();

		await user.click(within(dialog).getByRole("button", { name: "作り直す" }));

		expect(regeneratePassphrase).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("あたらしいぱすふれーず"),
		).toBeInTheDocument();
	});
});
