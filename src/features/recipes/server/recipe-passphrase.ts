import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createDrizzleRecipeSharingRepository } from "../infrastructure/drizzle-recipe-sharing-repository";
import {
	createEncryptedPassphrase,
	readPassphrase,
} from "./resolve-passphrase";

const publicIdSchema = v.object({
	publicId: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
});

// 自分の限定公開レシピの、パスフレーズ（限定公開でなければ null）。
export const getRecipePassphraseServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(publicIdSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const state = await createDrizzleRecipeSharingRepository(
			db,
			userId,
		).getSharingState(data.publicId);

		if (state?.visibility !== "unlisted" || !state.passphraseCipher) {
			return null;
		}

		return readPassphrase(state.passphraseCipher);
	});

// パスフレーズを作り直す。これまでに開けた人は、新しいパスフレーズを入れないと、見られなくなる。
export const regenerateRecipePassphraseServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(publicIdSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const cipher = await createEncryptedPassphrase();
		const replaced = await createDrizzleRecipeSharingRepository(
			db,
			userId,
		).replacePassphrase(data.publicId, cipher);

		if (!replaced) {
			throw new UserFacingError("限定公開のレシピが見つかりません");
		}

		return readPassphrase(cipher);
	});
