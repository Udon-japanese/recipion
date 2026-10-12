import { type SubmitEvent, useEffect, useRef, useState } from "react";
import * as v from "valibot";
import {
	OTP_EXPIRES_IN_SECONDS,
	OTP_LENGTH,
	OTP_RESEND_COOLDOWN_SECONDS,
} from "#/config/auth";
import { getTurnstileSiteKey } from "#/config/turnstile";
import { authClient } from "#/integrations/better-auth/auth-client";
import { getAuthErrorMessage } from "#/integrations/better-auth/auth-error-message";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import * as styles from "./auth-panel.css";
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
	"ボットの判定が完了していません。少し待ってから、お試しください。";

// パスワードは使わない。メールに届く 6 桁のコードだけでログインする（初めての人は、自動でアカウントが作られる）。
export function AuthPanel() {
	const { data: session, isPending, refetch } = useAppSession();

	const turnstileSiteKey = getTurnstileSiteKey(import.meta.env.DEV);

	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [digits, setDigits] = useState(() => createEmptyDigits(OTP_LENGTH));
	const [otpFocusKey, setOtpFocusKey] = useState(0);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const [captchaResetKey, setCaptchaResetKey] = useState(0);
	const [captchaLoadFailed, setCaptchaLoadFailed] = useState(false);
	const [cooldown, setCooldown] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

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

			resetToEmailStep();
			await refetch();
		} catch {
			setErrorMessage(getAuthErrorMessage(null));
		} finally {
			isVerifyingRef.current = false;
			setIsSubmitting(false);
		}
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

	async function handleSignOut() {
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			const result = await authClient.signOut();

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));

				return;
			}

			resetToEmailStep();
			await refetch();
		} catch {
			setErrorMessage(getAuthErrorMessage(null));
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isPending) {
		return (
			<section className={styles.panel}>
				<p className={styles.message}>ログイン状態を確認しています…</p>
			</section>
		);
	}

	if (session) {
		return (
			<section className={styles.panel}>
				<div className={styles.session}>
					<div>
						<p className={styles.sessionLabel}>ログイン中</p>
						<p className={styles.userName}>{session.user.name}</p>
						<p className={styles.userEmail}>{session.user.email}</p>
					</div>

					<button
						className={styles.secondaryButton}
						type="button"
						disabled={isSubmitting}
						onClick={() => void handleSignOut()}
					>
						ログアウト
					</button>
				</div>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</section>
		);
	}

	const canResend = cooldown === 0 && captchaToken !== null && !isSubmitting;

	return (
		<section className={styles.panel}>
			{/* ブラウザの標準の検証は使わない（メールアドレスの検証と、日本語のメッセージは、こちらで行う）。 */}
			<form className={styles.form} onSubmit={handleSubmit} noValidate>
				{step === "email" ? (
					<>
						<p className={styles.notice}>
							メールアドレスに、ログイン用の{OTP_LENGTH}
							桁のコードを送ります。パスワードは不要です。初めての方は、自動でアカウントが作られます。
						</p>

						<label className={styles.field}>
							<span className={styles.label}>メールアドレス</span>
							<input
								className={styles.input}
								name="email"
								type="email"
								inputMode="email"
								value={email}
								autoComplete="email"
								onChange={(event) => setEmail(event.target.value)}
							/>
						</label>

						<button
							className={styles.primaryButton}
							type="submit"
							disabled={
								isSubmitting ||
								email.trim() === "" ||
								turnstileSiteKey === "" ||
								captchaToken === null
							}
						>
							{isSubmitting ? "送信中…" : "コードを送る"}
						</button>

						<p className={styles.consent}>
							ログインすると、
							<a href="/terms" target="_blank" rel="noreferrer">
								利用規約
							</a>
							と、
							<a href="/privacy" target="_blank" rel="noreferrer">
								プライバシーポリシー
							</a>
							（外国にある事業者への、情報の送信を含む）に同意したものとみなします。
						</p>
					</>
				) : (
					<>
						{notice ? <p className={styles.notice}>{notice}</p> : null}

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

						<button
							className={styles.primaryButton}
							type="submit"
							disabled={isSubmitting || !isComplete(digits)}
						>
							{isSubmitting ? "確認中…" : "ログインする"}
						</button>

						<div className={styles.actions}>
							<button
								className={styles.secondaryButton}
								type="button"
								disabled={!canResend}
								onClick={() => void sendCode()}
							>
								{cooldown > 0
									? `コードを再送（あと${cooldown}秒）`
									: "コードを再送"}
							</button>

							<button
								className={styles.secondaryButton}
								type="button"
								disabled={isSubmitting}
								onClick={() => {
									setErrorMessage(null);
									resetToEmailStep();
								}}
							>
								メールアドレスを変更
							</button>
						</div>
					</>
				)}

				{turnstileSiteKey === "" ? (
					<p className={styles.error} role="alert">
						ボットの判定の設定が未完了のため、ログインできません。
					</p>
				) : (
					<>
						<TurnstileWidget
							siteKey={turnstileSiteKey}
							onToken={setCaptchaToken}
							onLoadError={() => setCaptchaLoadFailed(true)}
							resetKey={captchaResetKey}
						/>
						{captchaLoadFailed ? (
							<p className={styles.error} role="alert">
								ボットの判定を読み込めませんでした。広告ブロックなどを無効にして、ページを再読み込みしてください。
							</p>
						) : captchaToken === null ? (
							<p className={styles.message}>ボットの判定を確認しています…</p>
						) : null}
					</>
				)}

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</form>
		</section>
	);
}
