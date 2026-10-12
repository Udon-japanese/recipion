import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecipeUnlockForm } from "./recipe-unlock-form";

describe("RecipeUnlockForm", () => {
	it("開けたら、知らせる。違ったときは、存在しないのと同じ文を出す", async () => {
		const user = userEvent.setup();
		const onUnlocked = vi.fn();
		const onUnlock = vi
			.fn<(passphrase: string) => Promise<"unlocked" | "wrong" | "locked">>()
			.mockResolvedValueOnce("wrong")
			.mockResolvedValueOnce("locked")
			.mockResolvedValueOnce("unlocked");

		render(<RecipeUnlockForm onUnlock={onUnlock} onUnlocked={onUnlocked} />);

		const input = screen.getByLabelText("パスフレーズ");
		const submit = screen.getByRole("button", { name: "開く" });

		await user.type(input, "まちがい");
		await user.click(submit);

		expect(
			await screen.findByText("パスフレーズが違うか、レシピが見つかりません。"),
		).toBeInTheDocument();

		await user.click(submit);

		expect(await screen.findByText(/しばらく試せません/u)).toBeInTheDocument();

		await user.click(submit);

		expect(onUnlocked).toHaveBeenCalledTimes(1);
	});

	it("空のままでは送らない", async () => {
		const user = userEvent.setup();
		const onUnlock = vi.fn();

		render(<RecipeUnlockForm onUnlock={onUnlock} onUnlocked={vi.fn()} />);
		await user.click(screen.getByRole("button", { name: "開く" }));

		expect(onUnlock).not.toHaveBeenCalled();
	});
});
