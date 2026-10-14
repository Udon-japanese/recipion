import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./sign-out-button";

const mocks = vi.hoisted(() => ({
	signOut: vi.fn(),
	refetch: vi.fn(async () => {}),
	navigate: vi.fn(async () => {}),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mocks.navigate,
}));

vi.mock("#/integrations/better-auth/use-app-session", () => ({
	useAppSession: () => ({ refetch: mocks.refetch }),
}));

vi.mock("#/integrations/better-auth/auth-client", () => ({
	authClient: { signOut: mocks.signOut },
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

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
});
