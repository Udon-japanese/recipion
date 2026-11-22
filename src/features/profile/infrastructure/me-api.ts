import { apiClient, readApiResponse } from "#/api/client";
import type { Avatar } from "#/features/avatar/domain/avatar";

// 本人の API（/api/v1/me）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const me = apiClient.api.v1.me;

export async function getProfile() {
	return readApiResponse(await me.profile.$get());
}

// 断られたときは、欄ごとの文を返す（{ ok: false, errors }）。
export async function updateProfile(input: { name: string; handle: string }) {
	return readApiResponse(await me.profile.$post({ json: input }));
}

export async function updateAvatar(avatar: Avatar | null) {
	// 画面のアバターは、配置が readonly。送る JSON の型（ふつうの配列）に合わせて、写してから送る。
	const json = {
		avatar: avatar && { ...avatar, placements: [...avatar.placements] },
	};

	return readApiResponse(await me.avatar.$post({ json }));
}
