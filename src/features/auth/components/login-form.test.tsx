import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const mocks = vi.hoisted(() => ({
	sendVerificationOtp: vi.fn(),
	signInEmailOtp: vi.fn(),
	signOut: vi.fn(),
	refetch: vi.fn(async () => {}),
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

beforeEach(() => {
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

// コードの入力欄（1つ。見た目の枠は、その上に重なっている）。
function codeInput(): HTMLInputElement {
	return screen.getByRole("textbox", {
		name: /ログイン用コード/u,
	}) as HTMLInputElement;
}

// 見た目の枠に出ている桁。
function digitBoxes(): string[] {
	return [...document.querySelectorAll("[data-otp-box]")].map(
		(box) => box.textContent ?? "",
	);
}

describe("LoginForm（メールのワンタイムコード）", () => {
	it("パスワード欄はなく、メールアドレスを入れて、コードを送る", async () => {
		const user = userEvent.setup();

		render(<LoginForm refetchSession={mocks.refetch} />);

		expect(screen.queryByLabelText("パスワード")).toBeNull();

		await sendCodeFor(user, "user@example.com");

		// Turnstile のトークンを、ヘッダーに付けて送る
		expect(mocks.sendVerificationOtp).toHaveBeenCalledWith(
			{ email: "user@example.com", type: "sign-in" },
			{ headers: { "x-captcha-response": "captcha-token" } },
		);

		// コードの入力に進む（入力欄は1つ、見た目の枠は6つ）
		expect(codeInput()).toBeTruthy();
		expect(digitBoxes()).toHaveLength(6);
		expect(
			screen.getByText(/user@example.com に6桁のコードを送りました/u),
		).toBeTruthy();
	});

	it("6桁が揃うと、自動でログインを試み、成功したらセッションを取り直す", async () => {
		const user = userEvent.setup();

		render(<LoginForm refetchSession={mocks.refetch} />);
		await sendCodeFor(user, "user@example.com");

		await user.click(codeInput());
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

		render(<LoginForm refetchSession={mocks.refetch} />);
		await sendCodeFor(user, "user@example.com");

		await user.click(codeInput());
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

		render(<LoginForm refetchSession={mocks.refetch} />);
		await sendCodeFor(user, "user@example.com");

		await user.click(codeInput());
		await user.keyboard("111111");

		expect((await screen.findByRole("alert")).textContent).toBe(
			"コードが正しくありません。",
		);
		expect(digitBoxes()).toEqual(["", "", "", "", "", ""]);
		expect(codeInput().value).toBe("");
		expect(mocks.refetch).not.toHaveBeenCalled();
	});

	it("メールアドレスの形式が正しくなければ、送信しない", async () => {
		const user = userEvent.setup();

		render(<LoginForm refetchSession={mocks.refetch} />);

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

		render(<LoginForm refetchSession={mocks.refetch} />);
		await sendCodeFor(user, "user@example.com");

		expect((await screen.findByRole("alert")).textContent).toContain(
			"しばらく待って",
		);
		// コードの入力には進まない
		expect(
			screen.queryByRole("textbox", { name: /ログイン用コード/u }),
		).toBeNull();
	});

	it("コードを送ったあとは、再送の待ち時間を表示し、メールアドレスを変更できる", async () => {
		const user = userEvent.setup();

		render(<LoginForm refetchSession={mocks.refetch} />);
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
		expect(
			screen.queryByRole("textbox", { name: /ログイン用コード/u }),
		).toBeNull();
	});

	it("メールアドレスの入力の画面に、利用規約へのリンクと、同意のみなしの表示を出す", () => {
		render(<LoginForm refetchSession={mocks.refetch} />);

		expect(
			screen.getByText(/ログインすると、.*に同意したものとみなします/u),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute(
			"href",
			"/terms",
		);
	});
});
