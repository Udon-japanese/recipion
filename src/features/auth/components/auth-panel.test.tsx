import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPanel } from "./auth-panel";

const mocks = vi.hoisted(() => ({
	useAppSession: vi.fn(),
	sendVerificationOtp: vi.fn(),
	signInEmailOtp: vi.fn(),
	signOut: vi.fn(),
	refetch: vi.fn(async () => {}),
}));

vi.mock("#/integrations/better-auth/use-app-session", () => ({
	useAppSession: mocks.useAppSession,
}));

vi.mock("#/integrations/better-auth/auth-client", () => ({
	authClient: {
		emailOtp: { sendVerificationOtp: mocks.sendVerificationOtp },
		signIn: { emailOtp: mocks.signInEmailOtp },
		signOut: mocks.signOut,
	},
}));

// Turnstile は、ボット判定を通ったことにして、トークンを返す。
vi.mock("./turnstile-widget", () => ({
	TurnstileWidget: ({
		onToken,
		resetKey,
	}: {
		onToken: (token: string | null) => void;
		resetKey: number;
	}) => {
		// biome-ignore lint/correctness/useExhaustiveDependencies: resetKey が変わるたびに、新しいトークンを返す。
		useEffect(() => {
			onToken("captcha-token");
		}, [resetKey]);

		return <div data-testid="turnstile" />;
	},
}));

function guest() {
	mocks.useAppSession.mockReturnValue({
		data: null,
		isPending: false,
		refetch: mocks.refetch,
	});
}

beforeEach(() => {
	guest();
	mocks.sendVerificationOtp.mockResolvedValue({
		data: { success: true },
		error: null,
	});
	mocks.signInEmailOtp.mockResolvedValue({ data: {}, error: null });
	mocks.signOut.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

async function sendCodeFor(
	user: ReturnType<typeof userEvent.setup>,
	email: string,
) {
	await user.type(
		screen.getByRole("textbox", { name: "メールアドレス" }),
		email,
	);
	const button = screen.getByRole("button", { name: "コードを送る" });

	await waitFor(() =>
		expect((button as HTMLButtonElement).disabled).toBe(false),
	);
	await user.click(button);
}

function digitBoxes(): HTMLInputElement[] {
	return screen.getAllByRole("textbox", {
		name: /桁目/u,
	}) as HTMLInputElement[];
}

describe("AuthPanel（メールのワンタイムコード）", () => {
	it("パスワード欄はなく、メールアドレスを入れて、コードを送る", async () => {
		const user = userEvent.setup();

		render(<AuthPanel />);

		expect(screen.queryByLabelText("パスワード")).toBeNull();

		await sendCodeFor(user, "user@example.com");

		// Turnstile のトークンを、ヘッダーに付けて送る
		expect(mocks.sendVerificationOtp).toHaveBeenCalledWith(
			{ email: "user@example.com", type: "sign-in" },
			{ headers: { "x-captcha-response": "captcha-token" } },
		);

		// コードの入力に進む（1桁ずつ6つの欄）
		expect(digitBoxes()).toHaveLength(6);
		expect(
			screen.getByText(/user@example.com に6桁のコードを送りました/u),
		).toBeTruthy();
	});

	it("6桁が揃うと、自動でログインを試み、成功したらセッションを取り直す", async () => {
		const user = userEvent.setup();

		render(<AuthPanel />);
		await sendCodeFor(user, "user@example.com");

		await user.click(digitBoxes()[0] as HTMLInputElement);
		await user.keyboard("123456");

		await waitFor(() =>
			expect(mocks.signInEmailOtp).toHaveBeenCalledWith({
				email: "user@example.com",
				otp: "123456",
			}),
		);
		await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
		expect(mocks.signInEmailOtp).toHaveBeenCalledTimes(1);
	});

	it("コードを貼り付けても、自動でログインを試みる", async () => {
		const user = userEvent.setup();

		render(<AuthPanel />);
		await sendCodeFor(user, "user@example.com");

		await user.click(digitBoxes()[0] as HTMLInputElement);
		await user.paste("654321");

		await waitFor(() =>
			expect(mocks.signInEmailOtp).toHaveBeenCalledWith({
				email: "user@example.com",
				otp: "654321",
			}),
		);
	});

	it("コードが間違っていたら、理由を表示して、入力欄を空にする", async () => {
		const user = userEvent.setup();

		mocks.signInEmailOtp.mockResolvedValue({
			data: null,
			error: { code: "INVALID_OTP", message: "Invalid OTP", status: 400 },
		});

		render(<AuthPanel />);
		await sendCodeFor(user, "user@example.com");

		await user.click(digitBoxes()[0] as HTMLInputElement);
		await user.keyboard("111111");

		expect((await screen.findByRole("alert")).textContent).toBe(
			"コードが正しくありません。",
		);
		expect(digitBoxes().map((box) => box.value)).toEqual([
			"",
			"",
			"",
			"",
			"",
			"",
		]);
		expect(mocks.refetch).not.toHaveBeenCalled();
	});

	it("メールアドレスの形式が正しくなければ、送信しない", async () => {
		const user = userEvent.setup();

		render(<AuthPanel />);

		await sendCodeFor(user, "not-an-email");

		expect((await screen.findByRole("alert")).textContent).toBe(
			"メールアドレスを確認してください",
		);
		expect(mocks.sendVerificationOtp).not.toHaveBeenCalled();
	});

	it("送信が、レート制限で断られたら、待つように伝える", async () => {
		const user = userEvent.setup();

		mocks.sendVerificationOtp.mockResolvedValue({
			data: null,
			error: {
				code: "AUTH_RATE_LIMITED",
				message: "Too many requests",
				status: 429,
			},
		});

		render(<AuthPanel />);
		await sendCodeFor(user, "user@example.com");

		expect((await screen.findByRole("alert")).textContent).toContain(
			"しばらく待って",
		);
		// コードの入力には進まない
		expect(screen.queryByRole("textbox", { name: "1桁目" })).toBeNull();
	});

	it("コードを送ったあとは、再送の待ち時間を表示し、メールアドレスを変更できる", async () => {
		const user = userEvent.setup();

		render(<AuthPanel />);
		await sendCodeFor(user, "user@example.com");

		const resend = screen.getByRole("button", { name: /コードを再送/u });

		expect(resend.textContent).toContain("あと60秒");
		expect((resend as HTMLButtonElement).disabled).toBe(true);

		await user.click(
			screen.getByRole("button", { name: "メールアドレスを変更" }),
		);

		expect(
			screen.getByRole("textbox", { name: "メールアドレス" }),
		).toBeTruthy();
		expect(screen.queryByRole("textbox", { name: "1桁目" })).toBeNull();
	});

	it("ログイン中は、名前とメールアドレスを表示し、ログアウトできる", async () => {
		const user = userEvent.setup();

		mocks.useAppSession.mockReturnValue({
			data: { user: { id: "u1", name: "山田", email: "yamada@example.com" } },
			isPending: false,
			refetch: mocks.refetch,
		});

		render(<AuthPanel />);

		expect(screen.getByText("山田")).toBeTruthy();
		expect(screen.getByText("yamada@example.com")).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "ログアウト" }));

		await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
	});

	it("ログイン状態の確認中は、その旨を表示する", () => {
		mocks.useAppSession.mockReturnValue({
			data: null,
			isPending: true,
			refetch: mocks.refetch,
		});

		render(<AuthPanel />);

		expect(screen.getByText("ログイン状態を確認しています…")).toBeTruthy();
	});
});
