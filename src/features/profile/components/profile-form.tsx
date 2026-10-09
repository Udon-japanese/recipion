import { type SubmitEvent, useState } from "react";
import type { Profile } from "../application/profile-repository";
import type { UpdateProfileResult } from "../application/update-profile";
import {
	displayNameMaxLength,
	handleMaxLength,
	handleMinLength,
} from "../domain/profile";
import * as styles from "./profile-form.css";

type ProfileFormProps = {
	profile: Profile;
	onSave: (input: {
		name: string;
		handle: string;
	}) => Promise<UpdateProfileResult>;
	// 保存のあと（ヘッダーなどの、ログイン中の名前の表示を、更新するため）。
	onChanged?: () => void;
};

type FieldErrors = { name?: string; handle?: string; form?: string };

// 公開される名前（表示名とハンドル）の編集。
export function ProfileForm({ profile, onSave, onChanged }: ProfileFormProps) {
	const [name, setName] = useState(profile.name);
	const [handle, setHandle] = useState(profile.handle);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [message, setMessage] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage(null);
		setIsBusy(true);

		try {
			const result = await onSave({ name, handle });

			if (result.ok) {
				setErrors({});
				setMessage("保存しました。");
				onChanged?.();
			} else {
				setErrors(result.errors);
			}
		} catch {
			setErrors({
				form: "保存できませんでした。時間をおいて、もう一度お試しください。",
			});
		} finally {
			setIsBusy(false);
		}
	}

	return (
		<section className={styles.container}>
			<h2 className={styles.title}>プロフィール</h2>
			<p className={styles.lead}>
				公開されるのは、表示名とハンドルだけです。メールアドレスは、公開されません。
			</p>

			<form
				className={styles.form}
				onSubmit={(event) => void handleSubmit(event)}
			>
				<div className={styles.field}>
					<label htmlFor="profile-name">表示名</label>
					<input
						id="profile-name"
						className={styles.input}
						value={name}
						onChange={(event) => setName(event.target.value)}
						aria-invalid={errors.name !== undefined}
						aria-describedby="profile-name-hint"
					/>
					<span id="profile-name-hint" className={styles.hint}>
						{displayNameMaxLength}文字まで。@ は使えません。
					</span>
					{errors.name ? (
						<p className={styles.error} role="alert">
							{errors.name}
						</p>
					) : null}
				</div>

				<div className={styles.field}>
					<label htmlFor="profile-handle">ハンドル</label>
					<span className={styles.handleRow}>
						<span aria-hidden="true">@</span>
						<input
							id="profile-handle"
							className={styles.handleInput}
							value={handle}
							onChange={(event) => setHandle(event.target.value)}
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							aria-invalid={errors.handle !== undefined}
							aria-describedby="profile-handle-hint"
						/>
					</span>
					<span id="profile-handle-hint" className={styles.hint}>
						半角の英小文字・数字・_・- の{handleMinLength}〜{handleMaxLength}
						文字。ほかの人と重ならない名前にしてください。あとから変えられます。
					</span>
					{errors.handle ? (
						<p className={styles.error} role="alert">
							{errors.handle}
						</p>
					) : null}
				</div>

				{errors.form ? (
					<p className={styles.error} role="alert">
						{errors.form}
					</p>
				) : null}

				<div className={styles.actions}>
					<button
						className={styles.primaryButton}
						type="submit"
						disabled={isBusy}
					>
						保存する
					</button>
					{message ? <output>{message}</output> : null}
				</div>
			</form>
		</section>
	);
}
