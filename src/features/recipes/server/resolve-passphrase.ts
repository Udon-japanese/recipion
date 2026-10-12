import { env } from "cloudflare:workers";

import type { DB } from "#/db/client";
import { containsLexiconTerm } from "#/features/moderation/domain/lexicon-check";
import { generatePassphrase } from "../domain/passphrase";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import { createDrizzleRecipeSharingRepository } from "../infrastructure/drizzle-recipe-sharing-repository";
import {
	decryptPassphrase,
	encryptPassphrase,
} from "../infrastructure/passphrase-cipher";
import { randomIndex } from "../infrastructure/random-index";

// 新しいパスフレーズを作って、暗号化する（不適切な語になっていないか、確かめる）。
export async function createEncryptedPassphrase(): Promise<string> {
	return encryptPassphrase(
		generatePassphrase(
			randomIndex,
			(passphrase) => !containsLexiconTerm(passphrase),
		),
		env.BETTER_AUTH_SECRET,
	);
}

// 保存するときの、パスフレーズ（暗号化したもの）。
// 限定公開でなければ null（消す）。すでに限定公開なら undefined（いまのまま）。新しく限定公開にするなら、新しく作る。
export async function resolvePassphraseCipher(
	db: DB,
	userId: string,
	visibility: RecipeVisibility,
	publicId: string | null,
): Promise<string | null | undefined> {
	if (visibility !== "unlisted") {
		return null;
	}

	if (publicId !== null) {
		const state = await createDrizzleRecipeSharingRepository(
			db,
			userId,
		).getSharingState(publicId);

		if (state?.visibility === "unlisted" && state.passphraseCipher) {
			return undefined;
		}
	}

	return createEncryptedPassphrase();
}

// 持ち主が見る、パスフレーズ。読めないときは null。
export async function readPassphrase(cipher: string): Promise<string | null> {
	return decryptPassphrase(cipher, env.BETTER_AUTH_SECRET);
}
