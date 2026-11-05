import { classifyRequestError } from "#/errors/classify-request-error";
import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";
import type {
	IngredientDictionaryCache,
	IngredientDictionaryOwnerScope,
} from "./ingredient-dictionary-cache";

// 辞書をサーバーから取り、端末に保存する。取れなければ、保存済みを使う（オフラインでも、補完と照合に使えるように）。
// ログインの状態が違う（別のアカウントになった、など）ときは、この人の控えも使わない。どちらもなければ、辞書なし（空）。
export async function loadIngredientDictionaryWithCache(
	ownerScope: IngredientDictionaryOwnerScope,
	loadRemote: () => Promise<IngredientDictionaryEntry[]>,
	cache: IngredientDictionaryCache,
	now = new Date(),
): Promise<IngredientDictionaryEntry[]> {
	try {
		const entries = await loadRemote();

		// 保存に失敗しても、取れた辞書は使う。
		await cache.save(ownerScope, entries, now).catch(() => {});

		return entries;
	} catch (error) {
		if (classifyRequestError(error) === "account") {
			return [];
		}

		const snapshot = await cache.find(ownerScope).catch(() => undefined);

		return snapshot?.entries ?? [];
	}
}
