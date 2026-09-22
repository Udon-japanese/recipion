import { type SubmitEvent, useState } from "react";
import * as v from "valibot";

import { authClient } from "#/integrations/better-auth/auth-client";
import * as styles from "./auth-panel.css";

const signInInputSchema = v.object({
	email: v.pipe(
		v.string(),
		v.trim(),
		v.email("メールアドレスを確認してください"),
	),
	password: v.pipe(
		v.string(),
		v.minLength(8, "パスワードは8文字以上にしてください"),
	),
});

const signUpInputSchema = v.object({
	...signInInputSchema.entries,
	name: v.pipe(v.string(), v.trim(), v.minLength(1, "名前を入力してください")),
});

type AuthMode = "sign-in" | "sign-up";

function getErrorMessage(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "認証処理に失敗しました";
}

export function AuthPanel() {
	const { data: session, isPending, refetch } = authClient.useSession();

	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			if (mode === "sign-up") {
				const input = v.parse(signUpInputSchema, {
					name,
					email,
					password,
				});

				const result = await authClient.signUp.email(input);

				if (result.error) {
					throw new Error(result.error.message);
				}
			} else {
				const input = v.parse(signInInputSchema, {
					email,
					password,
				});

				const result = await authClient.signIn.email(input);

				if (result.error) {
					throw new Error(result.error.message);
				}
			}

			setPassword("");
			await refetch();
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSignOut() {
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			const result = await authClient.signOut();

			if (result.error) {
				throw new Error(result.error.message);
			}

			await refetch();
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
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

	return (
		<section className={styles.panel}>
			<div className={styles.modeButtons}>
				<button
					className={styles.modeButton}
					type="button"
					aria-pressed={mode === "sign-in"}
					onClick={() => setMode("sign-in")}
				>
					ログイン
				</button>

				<button
					className={styles.modeButton}
					type="button"
					aria-pressed={mode === "sign-up"}
					onClick={() => setMode("sign-up")}
				>
					新規登録
				</button>
			</div>

			<form className={styles.form} onSubmit={handleSubmit}>
				{mode === "sign-up" ? (
					<label className={styles.field}>
						<span className={styles.label}>名前</span>
						<input
							className={styles.input}
							name="name"
							value={name}
							autoComplete="name"
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
				) : null}

				<label className={styles.field}>
					<span className={styles.label}>メールアドレス</span>
					<input
						className={styles.input}
						name="email"
						type="email"
						value={email}
						autoComplete="email"
						onChange={(event) => setEmail(event.target.value)}
					/>
				</label>

				<label className={styles.field}>
					<span className={styles.label}>パスワード</span>
					<input
						className={styles.input}
						name="password"
						type="password"
						value={password}
						autoComplete={
							mode === "sign-up" ? "new-password" : "current-password"
						}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</label>

				<button
					className={styles.primaryButton}
					type="submit"
					disabled={isSubmitting}
				>
					{isSubmitting
						? "処理中…"
						: mode === "sign-up"
							? "登録する"
							: "ログインする"}
				</button>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</form>
		</section>
	);
}
