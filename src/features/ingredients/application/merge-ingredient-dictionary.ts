import {
	createIngredientDictionary,
	findAliasProblem,
	findIngredientNameProblem,
	ingredientDictionaryLimits,
} from "../domain/ingredient-dictionary";
import type { IngredientDictionaryRepository } from "./ingredient-dictionary-repository";

export type MergedDictionaryEntry = {
	name: string;
	aliases: readonly string[];
	unmanaged: boolean;
};

export type MergeDictionaryResult = {
	// 新しく作った材料。
	created: number;
	// 足した呼び名。
	aliases: number;
	// 入れられなかった名前・呼び名（ほかの材料と重なる・上限など）。
	skipped: number;
};

// ファイルの辞書を、今の辞書に足し合わせる（置き換えない。消さない）。
// - 名前（呼び名を含む）が今の辞書にあれば、その材料に足す。なければ作る。
// - 呼び名は、使えるものだけ足す。「管理しない」は、在庫のない材料にだけ付ける。
// 1件ずつ、いまの辞書で確かめ直す（前の件で足したものと重ならないように）。
export async function mergeIngredientDictionary(
	entries: readonly MergedDictionaryEntry[],
	repository: IngredientDictionaryRepository,
): Promise<MergeDictionaryResult> {
	const result: MergeDictionaryResult = { created: 0, aliases: 0, skipped: 0 };
	let current = await repository.list();

	for (const entry of entries) {
		let dictionary = createIngredientDictionary(current);
		const canonicalName = dictionary.findCanonicalName(entry.name);
		let target = current.find((candidate) => candidate.name === canonicalName);

		if (!target) {
			if (
				current.length >= ingredientDictionaryLimits.maxIngredients ||
				findIngredientNameProblem(dictionary, entry.name)
			) {
				result.skipped += 1;
				continue;
			}

			await repository.create(entry.name);
			result.created += 1;
			current = await repository.list();
			dictionary = createIngredientDictionary(current);
			const createdName = dictionary.findCanonicalName(entry.name);
			target = current.find((candidate) => candidate.name === createdName);

			if (!target) {
				result.skipped += 1;
				continue;
			}
		}

		for (const alias of entry.aliases) {
			const latest = current.find((candidate) => candidate.id === target?.id);

			if (!latest) {
				break;
			}

			if (dictionary.findCanonicalName(alias) === latest.name) {
				// もう、この材料の名前か呼び名。
				continue;
			}

			if (findAliasProblem(dictionary, latest, alias)) {
				result.skipped += 1;
				continue;
			}

			await repository.addAlias(latest.id, alias);
			result.aliases += 1;
			current = current.map((candidate) =>
				candidate.id === latest.id
					? { ...candidate, aliases: [...candidate.aliases, alias] }
					: candidate,
			);
			dictionary = createIngredientDictionary(current);
		}

		if (entry.unmanaged && !target.hasInventory && !target.unmanaged) {
			await repository.setUnmanaged(target.id, true);
			current = current.map((candidate) =>
				candidate.id === target?.id
					? { ...candidate, unmanaged: true }
					: candidate,
			);
		}
	}

	return result;
}
