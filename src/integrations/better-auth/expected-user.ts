import * as v from "valibot";

// 画面が思っているユーザーの ID（サーバー関数の入力）。
export const expectedUserIdSchema = v.pipe(
	v.string(),
	v.minLength(1),
	v.maxLength(200),
);

// Cookie のユーザーが、画面が思っているユーザーと同じか（指定がなければ、確かめない）。
export function checkExpectedUser(
	sessionUserId: string,
	expectedUserId: string | undefined,
): boolean {
	return expectedUserId === undefined || expectedUserId === sessionUserId;
}

// API の入力に、画面が思っているユーザー（省略可）を足す。セッションのユーザーと違えば、resolveSession が断る。
export function withExpectedUserId<Entries extends v.ObjectEntries>(
	entries: Entries,
) {
	return v.object({
		...entries,
		expectedUserId: v.optional(expectedUserIdSchema),
	});
}
