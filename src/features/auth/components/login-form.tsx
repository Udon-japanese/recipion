import { type SubmitEvent, useEffect, useRef, useState } from "react";
import * as v from "valibot";
import { Button } from "#/components/button/button";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { Note } from "#/components/note/note";
import {
	OTP_EXPIRES_IN_SECONDS,
	OTP_LENGTH,
	OTP_RESEND_COOLDOWN_SECONDS,
} from "#/config/auth";
import { getTurnstileSiteKey } from "#/config/turnstile";
import { authClient } from "#/integrations/better-auth/auth-client";
import { getAuthErrorMessage } from "#/integrations/better-auth/auth-error-message";
import * as styles from "./login-form.css";
import { OtpInput } from "./otp-input";
import { createEmptyDigits, isComplete, joinDigits } from "./otp-input-logic";
import { TurnstileWidget } from "./turnstile-widget";

const emailSchema = v.pipe(
	v.string(),
	v.trim(),
	v.email("メールアドレスを確認してください"),
);

type Step = "email" | "code";

const captchaPendingMessage =
	"ボットの判定が完了していません。少し待ってからお試しください。";

type LoginFormProps = {
	// ログインできたあとに、セッションを取り直す。
	refetchSession: () => Promise<unknown>;
	// セッションを取り直したあとに呼ぶ（画面の移動など）。
	onLoggedIn?: () => void;
};

// パスワードは使わない。メールに届く 6 桁のコードだけでログインする（初めての人は、自動でアカウントが作られる）。
export function LoginForm({ onLoggedIn, refetchSession }: LoginFormProps) {
	const turnstileSiteKey = getTurnstileSiteKey(import.meta.env.DEV);

	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [digits, setDigits] = useState(() => createEmptyDigits(OTP_LENGTH));
	const [otpFocusKey, setOtpFocusKey] = useState(0);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [captchaResetKey, setCaptchaResetKey] = useState(0);
	const [captchaLoadFailed, setCaptchaLoadFailed] = useState(false);
	const [captchaAttempt, setCaptchaAttempt] = useState(0);
	const [cooldown, setCooldown] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	// 再送：メールアドレスの段階に戻り、ボット判定が通ったら、そのまま送る。
	// （ボット判定は、コードを送るときだけ要る。コードの段階では、回数の制限があるので、出さない）
	const [isResending, setIsResending] = useState(false);

	// 自動送信（6 桁が揃ったとき）と、ボタンの二重の送信を防ぐ。
	const isVerifyingRef = useRef(false);

	useEffect(() => {
		if (cooldown <= 0) return;

		const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);

		return () => clearTimeout(timer);
	}, [cooldown]);

	function resetToEmailStep() {
		setStep("email");
		setDigits(createEmptyDigits(OTP_LENGTH));
		setCooldown(0);
		setNotice(null);
	}

	async function sendCode() {
		setErrorMessage(null);

		const parsedEmail = v.safeParse(emailSchema, email);

		if (!parsedEmail.success) {
			setErrorMessage(
				parsedEmail.issues[0]?.message ?? "メールアドレスを確認してください",
			);

			return;
		}

		if (!captchaToken) {
			setErrorMessage(captchaPendingMessage);

			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.emailOtp.sendVerificationOtp(
				{ email: parsedEmail.output, type: "sign-in" },
				{ headers: { "x-captcha-response": captchaToken } },
			);

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));

				return;
			}

			setEmail(parsedEmail.output);
			setStep("code");
			setDigits(createEmptyDigits(OTP_LENGTH));
			setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
			setOtpFocusKey((current) => current + 1);
			setNotice(
				`${parsedEmail.output} に${OTP_LENGTH}桁のコードを送りました（${Math.floor(OTP_EXPIRES_IN_SECONDS / 60)}分間有効）。届かないときは、迷惑メールのフォルダも確認してください。`,
			);
		} catch {
			setErrorMessage(getAuthErrorMessage(null));
		} finally {
			setIsSubmitting(false);
			// Turnstile のトークンは、1 回しか使えない。送信のたびに作り直す。
			setCaptchaToken(null);
			setCaptchaResetKey((current) => current + 1);
		}
	}

	async function verifyCode(code: string) {
		if (isVerifyingRef.current) return;

		isVerifyingRef.current = true;
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			const result = await authClient.signIn.emailOtp({ email, otp: code });

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));
				setDigits(createEmptyDigits(OTP_LENGTH));
				setOtpFocusKey((current) => current + 1);

				return;
			}

			// セッションを取り直すあいだも、コードの入力の画面のまま待つ（メールの入力に戻すと、ちらつく）。
			await refetchSession();

			// 画面が移動しないで、フォームが残る使い方のときだけ、初期の状態に戻す。
			if (onLoggedIn) {
				onLoggedIn();
				resetToEmailStep();
			}
		} catch {
			setErrorMessage(getAuthErrorMessage(null));
		} finally {
			isVerifyingRef.current = false;
			setIsSubmitting(false);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: sendCode は、描画ごとに作り直す関数。トークンが届いたときだけ動かす。
	useEffect(() => {
		if (step !== "email" || !isResending || !captchaToken) return;

		setIsResending(false);
		void sendCode();
	}, [step, isResending, captchaToken]);

	function resend() {
		setErrorMessage(null);
		setStep("email");
		setDigits(createEmptyDigits(OTP_LENGTH));
		setNotice(null);
		setIsResending(true);
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (step === "email") {
			void sendCode();

			return;
		}

		if (isComplete(digits)) {
			void verifyCode(joinDigits(digits));
		}
	}

	const canResend = cooldown === 0 && !isSubmitting;

	const isCaptchaReady = captchaToken !== null;
	const botCheck = (
		<BotCheck
			siteKey={turnstileSiteKey}
			isReady={isCaptchaReady}
			loadFailed={captchaLoadFailed}
			attempt={captchaAttempt}
			resetKey={captchaResetKey}
			onToken={setCaptchaToken}
			onLoadError={() => setCaptchaLoadFailed(true)}
			onRetry={() => {
				setCaptchaLoadFailed(false);
				setCaptchaAttempt((current) => current + 1);
			}}
		/>
	);

	return (
		<form className={styles.form} onSubmit={handleSubmit} noValidate>
			{step === "email" ? (
				<>
					<p className={styles.lead}>
						メールアドレスにログイン用の{OTP_LENGTH}
						桁のコードを送ります。パスワードは不要です。初めての方は自動でアカウントが作られます。
					</p>

					<Field label="メールアドレス">
						{(control) => (
							<TextInput
								{...control}
								name="email"
								type="email"
								inputMode="email"
								value={email}
								autoComplete="email"
								onChange={(event) => setEmail(event.target.value)}
							/>
						)}
					</Field>

					{botCheck}

					<Button
						type="submit"
						size="lg"
						fullWidth
						status={isSubmitting || isResending ? "pending" : "idle"}
						pendingLabel="送信中"
						disabled={
							email.trim() === "" ||
							turnstileSiteKey === "" ||
							captchaToken === null
						}
					>
						コードを送る
					</Button>

					<p className={styles.consent}>
						ログインすると、
						<a href="/terms" target="_blank" rel="noreferrer">
							利用規約
						</a>
						と
						<a href="/privacy" target="_blank" rel="noreferrer">
							プライバシーポリシー
						</a>
						（外国にある事業者への情報の送信を含む）に同意したものとみなします。
					</p>
				</>
			) : (
				<>
					{notice ? <Note tone="info">{notice}</Note> : null}

					<div className={styles.field}>
						<span className={styles.label}>
							ログイン用コード（{OTP_LENGTH}桁）
						</span>
						<OtpInput
							digits={digits}
							onChange={setDigits}
							onComplete={(code) => void verifyCode(code)}
							label={`ログイン用コード（${OTP_LENGTH}桁）`}
							disabled={isSubmitting}
							invalid={errorMessage !== null}
							autoFocus
							focusRequestKey={otpFocusKey}
						/>
					</div>

					<Button
						type="submit"
						size="lg"
						fullWidth
						status={isSubmitting ? "pending" : "idle"}
						pendingLabel="確認中"
						disabled={!isComplete(digits)}
					>
						ログインする
					</Button>

					<Button
						variant="secondary"
						fullWidth
						disabled={!canResend}
						onClick={resend}
					>
						{cooldown > 0
							? `コードを再送（あと${cooldown}秒）`
							: "コードを再送"}
					</Button>

					<Button
						variant="ghost"
						fullWidth
						disabled={isSubmitting}
						onClick={() => {
							setErrorMessage(null);
							setIsResending(false);
							resetToEmailStep();
						}}
					>
						メールアドレスを変更
					</Button>
				</>
			)}

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
		</form>
	);
}

type BotCheckProps = {
	siteKey: string;
	isReady: boolean;
	loadFailed: boolean;
	attempt: number;
	resetKey: number;
	onToken: (token: string | null) => void;
	onLoadError: () => void;
	onRetry: () => void;
};

// ボット判定（Cloudflare Turnstile）。通ると「確認できました」。判定のために操作が要るときは、そのまま見える。
function BotCheck({
	siteKey,
	isReady,
	loadFailed,
	attempt,
	resetKey,
	onToken,
	onLoadError,
	onRetry,
}: BotCheckProps) {
	if (siteKey === "") {
		return (
			<Note tone="warn">
				ボットの判定の設定が未完了のため、ログインできません。
			</Note>
		);
	}

	return (
		<div className={styles.botCheck}>
			{loadFailed ? (
				<Note
					tone="error"
					action={
						<Button variant="secondary" size="sm" onClick={onRetry}>
							再試行
						</Button>
					}
				>
					ボットの判定を読み込めませんでした。広告ブロックなどを無効にして、再試行してください。
				</Note>
			) : isReady ? (
				<div className={styles.botCheckDone}>
					<Icon name="check-circle" size={20} />
					<output>確認できました</output>
				</div>
			) : (
				<div className={styles.botCheckPending}>
					<span className={styles.spin_}>
						<Icon name="spinner" size={20} />
					</span>
					<span>ボット判定を確認しています…</span>
				</div>
			)}

			{/* ウィジェットは、判定が済んだら隠す。作り直すときは、また見える。 */}
			<div hidden={isReady || loadFailed}>
				<TurnstileWidget
					key={attempt}
					siteKey={siteKey}
					onToken={onToken}
					onLoadError={onLoadError}
					resetKey={resetKey}
				/>
			</div>
		</div>
	);
}
