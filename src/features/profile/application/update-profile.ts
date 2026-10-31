import {
	getDisplayNameErrorMessage,
	getHandleErrorMessage,
	normalizeDisplayName,
	normalizeHandle,
	validateDisplayName,
	validateHandle,
} from "../domain/profile";
import type { ProfileRepository } from "./profile-repository";

export type ProfileFieldErrors = {
	name?: string;
	handle?: string;
	form?: string;
};

export type UpdateProfileResult =
	| { ok: true }
	| { ok: false; errors: ProfileFieldErrors };

// 値が変わった欄だけを、審査する（断るときは、画面に出す文を返す。通すなら null）。
export type ProfileModerator = (changes: {
	name?: string;
	handle?: string;
}) => Promise<ProfileFieldErrors | null>;

// 入力を検証して、プロフィールを更新する。問題があれば、項目ごとの、画面に出す文を返す。
export async function updateProfile(
	repository: ProfileRepository,
	input: { name: string; handle: string },
	moderate?: ProfileModerator,
): Promise<UpdateProfileResult> {
	const name = normalizeDisplayName(input.name);
	const handle = normalizeHandle(input.handle);
	const nameError = validateDisplayName(name);
	const handleError = validateHandle(handle);

	if (nameError || handleError) {
		return {
			ok: false,
			errors: {
				...(nameError && { name: getDisplayNameErrorMessage(nameError) }),
				...(handleError && { handle: getHandleErrorMessage(handleError) }),
			},
		};
	}

	// 他の人に見える名前なので、変えた欄だけ、保存の前に審査する。
	if (moderate) {
		const current = await repository.get();
		const changes = {
			...(current?.name !== name && { name }),
			...(current?.handle !== handle && { handle }),
		};

		if (changes.name !== undefined || changes.handle !== undefined) {
			const refusal = await moderate(changes);

			if (refusal) {
				return { ok: false, errors: refusal };
			}
		}
	}

	const result = await repository.update({ name, handle });

	if (result === "handle-taken") {
		return {
			ok: false,
			errors: { handle: "このハンドルはすでに使われています。" },
		};
	}

	if (result === "not-found") {
		return {
			ok: false,
			errors: { form: "ユーザーが見つかりませんでした。" },
		};
	}

	return { ok: true };
}
