import { render, screen, waitFor } from "@testing-library/react";
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

	it("共有リンクのパスフレーズがあれば、入れて、1回だけ自動で開く", async () => {
		const onUnlocked = vi.fn();
		const onUnlock = vi.fn(async () => "unlocked" as const);
		const takeSharedPassphrase = vi
			.fn<() => string | null>()
			.mockReturnValueOnce("ねこりんご")
			.mockReturnValue(null);

		render(
			<RecipeUnlockForm
				onUnlock={onUnlock}
				onUnlocked={onUnlocked}
				takeSharedPassphrase={takeSharedPassphrase}
			/>,
		);

		await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
		expect(onUnlock).toHaveBeenCalledTimes(1);
		expect(onUnlock).toHaveBeenCalledWith("ねこりんご");
		expect(screen.getByLabelText("パスフレーズ")).toHaveValue("ねこりんご");
	});

	it("共有リンクのパスフレーズが違えば、入れたまま、違うと知らせる", async () => {
		const onUnlock = vi.fn(async () => "wrong" as const);

		render(
			<RecipeUnlockForm
				onUnlock={onUnlock}
				onUnlocked={vi.fn()}
				takeSharedPassphrase={() => "ふるいぱすふれーず"}
			/>,
		);

		expect(
			await screen.findByText("パスフレーズが違うか、レシピが見つかりません。"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("パスフレーズ")).toHaveValue(
			"ふるいぱすふれーず",
		);
	});
});
