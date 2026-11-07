import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

const mocks = vi.hoisted(() => ({
	session: null as null | { user: { id: string } },
	signOut: vi.fn(),
	refetch: vi.fn(async () => {}),
	navigate: vi.fn(async () => {}),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock("#/integrations/better-auth/use-app-session", () => ({
	useAppSession: () => ({ data: mocks.session, refetch: mocks.refetch }),
}));

vi.mock("#/integrations/better-auth/auth-client", () => ({
	authClient: { signOut: mocks.signOut },
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mocks.session = null;
});

function renderSignedIn(unsentCount: number) {
	mocks.session = { user: { id: "user-1" } };
	mocks.signOut.mockResolvedValue({ data: {}, error: null });

	const syncBeforeSignOut = vi.fn(async () => null);
	const clearLocalMemo = vi.fn(async () => true);

	render(
		<SignOutButton
			syncBeforeSignOut={syncBeforeSignOut}
			countUnsent={async () => unsentCount}
			clearLocalMemo={clearLocalMemo}
		/>,
	);

	return { syncBeforeSignOut, clearLocalMemo };
}

describe("SignOutButton", () => {
	it("ログアウトして、セッションを取り直し、ホームに移る", async () => {
		const user = userEvent.setup();

		mocks.signOut.mockResolvedValue({ data: {}, error: null });
		render(<SignOutButton />);

		await user.click(screen.getByRole("button", { name: "ログアウト" }));

		await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
		await waitFor(() =>
			expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }),
		);
	});

	it("失敗したら、理由を出して、移動しない", async () => {
		const user = userEvent.setup();

		mocks.signOut.mockResolvedValue({
			data: null,
			error: { status: 500, message: "x" },
		});
		render(<SignOutButton />);

		await user.click(screen.getByRole("button", { name: "ログアウト" }));

		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	describe("この端末の、その人の買い物メモ", () => {
		it("送り残しがなければ、送ってからログアウトし、そのあとで消す", async () => {
			const user = userEvent.setup();
			const { syncBeforeSignOut, clearLocalMemo } = renderSignedIn(0);

			await user.click(screen.getByRole("button", { name: "ログアウト" }));

			await waitFor(() =>
				expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }),
			);
			expect(syncBeforeSignOut).toHaveBeenCalledWith("user:user-1");
			expect(clearLocalMemo).toHaveBeenCalledWith("user:user-1", {
				discardUnsent: false,
			});
			expect(screen.queryByRole("alertdialog")).toBeNull();
		});

		it("送り残しがあれば、先に聞く。「ログアウトしない」なら、ログアウトせず、何も消さない", async () => {
			const user = userEvent.setup();
			const { clearLocalMemo } = renderSignedIn(2);

			await user.click(screen.getByRole("button", { name: "ログアウト" }));

			const dialog = await screen.findByRole("alertdialog", {
				name: "まだ送れていない変更があります",
			});

			expect(dialog.textContent).toContain("2件");
			expect(dialog.textContent).toContain("この端末にしかありません");
			expect(dialog.textContent).toContain("元に戻せません");

			await user.click(
				screen.getByRole("button", { name: "ログアウトしない" }),
			);

			expect(mocks.signOut).not.toHaveBeenCalled();
			expect(clearLocalMemo).not.toHaveBeenCalled();
		});

		it("「消してログアウト」を選んだら、ログアウトしてから、送り残しも消す", async () => {
			const user = userEvent.setup();
			const { clearLocalMemo } = renderSignedIn(1);

			await user.click(screen.getByRole("button", { name: "ログアウト" }));
			await user.click(
				await screen.findByRole("button", { name: "消してログアウト" }),
			);

			await waitFor(() =>
				expect(clearLocalMemo).toHaveBeenCalledWith("user:user-1", {
					discardUnsent: true,
				}),
			);
			expect(mocks.signOut).toHaveBeenCalledTimes(1);
		});

		it("ログアウトに失敗したら、何も消さない", async () => {
			const user = userEvent.setup();
			const { clearLocalMemo } = renderSignedIn(0);

			mocks.signOut.mockResolvedValue({
				data: null,
				error: { status: 500, message: "x" },
			});
			await user.click(screen.getByRole("button", { name: "ログアウト" }));

			expect(await screen.findByRole("alert")).toBeTruthy();
			expect(clearLocalMemo).not.toHaveBeenCalled();
		});
	});
});
