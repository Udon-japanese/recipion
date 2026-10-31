import {
	emailOTPClient,
	inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [
		emailOTPClient(),
		// アバターを、セッションの user から読む（中身は parseAvatar で確かめる）。
		inferAdditionalFields({
			user: { avatar: { type: "json", required: false } },
		}),
	],
});
