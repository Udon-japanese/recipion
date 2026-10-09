import {
	getDisplayNameErrorMessage,
	getHandleErrorMessage,
	normalizeDisplayName,
	normalizeHandle,
	validateDisplayName,
	validateHandle,
} from "../domain/profile";
import type { ProfileRepository } from "./profile-repository";

export type UpdateProfileResult =
	| { ok: true }
	| { ok: false; errors: { name?: string; handle?: string; form?: string } };

// 入力を検証して、プロフィールを更新する。問題があれば、項目ごとの、画面に出す文を返す。
export async function updateProfile(
	repository: ProfileRepository,
	input: { name: string; handle: string },
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

	const result = await repository.update({ name, handle });

	if (result === "handle-taken") {
		return {
			ok: false,
			errors: { handle: "このハンドルは、すでに使われています。" },
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
