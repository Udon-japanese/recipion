import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { Field, TextInput } from "#/components/field/field";
import { Note } from "#/components/note/note";
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
	const action = useButtonAction();

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		void action.run(save);
	}

	async function save() {
		try {
			const result = await onSave({ name, handle });

			if (result.ok) {
				setErrors({});
				onChanged?.();

				return true;
			}

			setErrors(result.errors);

			return false;
		} catch {
			setErrors({
				form: "保存できませんでした。時間をおいて、もう一度お試しください。",
			});

			return false;
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>プロフィール</h1>
			<p className={styles.lead}>
				公開されるのは、表示名とハンドルだけです。メールアドレスは、公開されません。
			</p>

			<Card padding="md">
				<form
					className={styles.form}
					onSubmit={(event) => void handleSubmit(event)}
				>
					<Field
						label="表示名"
						hint={`${displayNameMaxLength}文字まで。@ は使えません。`}
						error={errors.name}
					>
						{(control) => (
							<TextInput
								{...control}
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						)}
					</Field>

					<Field
						label="ハンドル"
						hint={`半角の英小文字・数字・_・- の${handleMinLength}〜${handleMaxLength}文字。ほかの人と重ならない名前にしてください。あとから変えられます。`}
						error={errors.handle}
					>
						{(control) => (
							<span className={styles.handleRow}>
								<span className={styles.at} aria-hidden="true">
									@
								</span>
								<TextInput
									{...control}
									value={handle}
									onChange={(event) => setHandle(event.target.value)}
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
								/>
							</span>
						)}
					</Field>

					{errors.form ? <Note tone="error">{errors.form}</Note> : null}

					<div className={styles.actions}>
						<Button
							type="submit"
							status={action.status}
							successLabel="保存しました"
						>
							保存する
						</Button>
					</div>
				</form>
			</Card>
		</section>
	);
}
