// プロフィール（公開される名前とハンドル）の保存。呼び出すユーザー本人のものだけを扱う。

export type Profile = {
	// 表示名（公開される）。
	name: string;
	// ハンドル（公開される。一意）。
	handle: string;
};

export type UpdateProfileInput = {
	name: string;
	handle: string;
};

export type ProfileRepository = {
	get(): Promise<Profile | null>;
	// 表示名とハンドルを更新する。ハンドルが、ほかのユーザーと重なるときは "handle-taken"。
	update(
		input: UpdateProfileInput,
	): Promise<"updated" | "handle-taken" | "not-found">;
};
