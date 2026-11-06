import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { findIngredientCatalogEntry } from "../domain/ingredient-catalog";
import {
	createIngredientDictionary,
	describeIngredientNameProblem,
	findAliasProblem,
	findIngredientNameProblem,
	type IngredientDictionaryEntry,
	ingredientDictionaryLimits,
	listUserAliases,
} from "../domain/ingredient-dictionary";
import { normalizeIngredientName } from "../domain/normalize-ingredient-name";
import type { IngredientDictionaryRepository } from "./ingredient-dictionary-repository";

const nameSchema = v.pipe(v.string(), v.maxLength(200));
const idSchema = v.pipe(v.string(), v.uuid());

export const ingredientDictionaryCommandSchema = v.variant("kind", [
	v.object({ kind: v.literal("create"), name: nameSchema }),
	v.object({
		kind: v.literal("rename"),
		ingredientId: idSchema,
		name: nameSchema,
	}),
	v.object({
		kind: v.literal("add-alias"),
		ingredientId: idSchema,
		alias: nameSchema,
	}),
	v.object({
		kind: v.literal("remove-alias"),
		ingredientId: idSchema,
		alias: nameSchema,
	}),
	v.object({ kind: v.literal("remove"), ingredientId: idSchema }),
	v.object({
		kind: v.literal("set-unmanaged"),
		ingredientId: idSchema,
		unmanaged: v.boolean(),
	}),
	// 「もしかして」の統合：sourceName（入力した名前）を、targetName（今ある材料）の呼び名にする。
	v.object({
		kind: v.literal("merge-names"),
		sourceName: nameSchema,
		targetName: nameSchema,
	}),
	// 名前で「管理しない」にする（レシピの材料の行から。辞書になければ、食材を作ってから付ける）。
	v.object({ kind: v.literal("mark-unmanaged-by-name"), name: nameSchema }),
]);

export type IngredientDictionaryCommand = v.InferOutput<
	typeof ingredientDictionaryCommandSchema
>;

const unmanagedWithInventoryMessage =
	"在庫にあるため、管理しない材料にできません。先に在庫から消してください";

function findTarget(
	entries: readonly IngredientDictionaryEntry[],
	ingredientId: string,
): IngredientDictionaryEntry {
	const target = entries.find((entry) => entry.id === ingredientId);

	if (!target) {
		throw new UserFacingError(
			"材料が見つかりません。画面を読み込み直してください",
		);
	}

	return target;
}

function rejectProblem(
	problem: ReturnType<typeof findIngredientNameProblem>,
): void {
	if (problem) {
		throw new UserFacingError(describeIngredientNameProblem(problem));
	}
}

// 辞書の書き込み。いまの辞書を読み、名前の問題（重なり・カタログ・上限）を確かめてから書く。
export async function manageIngredientDictionary(
	command: IngredientDictionaryCommand,
	repository: IngredientDictionaryRepository,
): Promise<void> {
	const entries = await repository.list();
	const dictionary = createIngredientDictionary(entries);

	switch (command.kind) {
		case "create": {
			if (entries.length >= ingredientDictionaryLimits.maxIngredients) {
				throw new UserFacingError(
					`材料は${ingredientDictionaryLimits.maxIngredients}個までです`,
				);
			}

			rejectProblem(findIngredientNameProblem(dictionary, command.name));
			await repository.create(command.name);

			return;
		}
		case "rename": {
			const target = findTarget(entries, command.ingredientId);

			rejectProblem(
				findIngredientNameProblem(dictionary, command.name, target, {
					allowOwnName: true,
				}),
			);
			await repository.rename(target.id, command.name);

			return;
		}
		case "add-alias": {
			const target = findTarget(entries, command.ingredientId);

			rejectProblem(findAliasProblem(dictionary, target, command.alias));
			await repository.addAlias(target.id, command.alias);

			return;
		}
		case "remove-alias": {
			const target = findTarget(entries, command.ingredientId);
			const key = normalizeIngredientName(command.alias);
			const isUserAlias = listUserAliases(target).some(
				(alias) => normalizeIngredientName(alias) === key,
			);

			// カタログの別名は、在庫の照合に使うので、消さない。
			if (!isUserAlias) {
				throw new UserFacingError("この呼び名は消せません");
			}

			await repository.removeAlias(target.id, command.alias);

			return;
		}
		case "set-unmanaged": {
			const target = findTarget(entries, command.ingredientId);

			if (command.unmanaged && target.hasInventory) {
				throw new UserFacingError(unmanagedWithInventoryMessage);
			}

			await repository.setUnmanaged(target.id, command.unmanaged);

			return;
		}
		case "mark-unmanaged-by-name": {
			const canonicalName = dictionary.findCanonicalName(command.name);
			const existing = entries.find((entry) => entry.name === canonicalName);

			if (existing) {
				if (existing.hasInventory) {
					throw new UserFacingError(unmanagedWithInventoryMessage);
				}

				await repository.setUnmanaged(existing.id, true);

				return;
			}

			if (entries.length >= ingredientDictionaryLimits.maxIngredients) {
				throw new UserFacingError(
					`材料は${ingredientDictionaryLimits.maxIngredients}個までです`,
				);
			}

			rejectProblem(findIngredientNameProblem(dictionary, command.name));
			await repository.setUnmanaged(
				await repository.create(command.name),
				true,
			);

			return;
		}
		case "merge-names": {
			await mergeNames(
				command.sourceName,
				command.targetName,
				entries,
				repository,
			);

			return;
		}
		case "remove": {
			const target = findTarget(entries, command.ingredientId);

			if (target.hasInventory) {
				throw new UserFacingError(
					"在庫にあるため消せません。先に在庫から消してください",
				);
			}

			await repository.remove(target.id);

			return;
		}
	}
}

// 「もしかして」の統合。本文やメモの文字は変えず、名前を辞書の呼び名にするだけ。
// - 相手が辞書になく、カタログの食材なら、食材を作ってから足す。
// - 入力した名前が、もう別の材料なら、在庫のない方を、在庫のある方へまとめる（両方に在庫があれば、まとめない）。
async function mergeNames(
	sourceName: string,
	targetName: string,
	currentEntries: IngredientDictionaryEntry[],
	repository: IngredientDictionaryRepository,
): Promise<void> {
	let entries = currentEntries;
	let dictionary = createIngredientDictionary(entries);
	const targetCanonical = dictionary.findCanonicalName(targetName);
	let target = entries.find((entry) => entry.name === targetCanonical);

	if (!target) {
		const catalogEntry = findIngredientCatalogEntry(targetName);

		if (!catalogEntry) {
			throw new UserFacingError(
				"材料が見つかりません。画面を読み込み直してください",
			);
		}

		if (entries.length >= ingredientDictionaryLimits.maxIngredients) {
			throw new UserFacingError(
				`材料は${ingredientDictionaryLimits.maxIngredients}個までです`,
			);
		}

		const createdId = await repository.create(catalogEntry.name);

		entries = await repository.list();
		dictionary = createIngredientDictionary(entries);
		target = entries.find((entry) => entry.id === createdId);

		if (!target) {
			throw new UserFacingError("材料を作成できませんでした");
		}
	}

	const sourceCanonical = dictionary.findCanonicalName(sourceName);
	const source = entries.find((entry) => entry.name === sourceCanonical);

	if (source?.id === target.id) {
		return;
	}

	if (!source) {
		rejectProblem(findAliasProblem(dictionary, target, sourceName));
		await repository.addAlias(target.id, sourceName);

		return;
	}

	if (source.hasInventory) {
		throw new UserFacingError(
			target.hasInventory
				? "どちらにも在庫があるため、まとめられません"
				: `「${source.name}」に在庫があるため、まとめられません。「${target.name}」を「${source.name}」の呼び名にしてください`,
		);
	}

	// 移す名前（元の名前と、その呼び名）が、相手の呼び名として使えるか。元の材料を除いた辞書で確かめる。
	const withoutSource = createIngredientDictionary(
		entries.filter((entry) => entry.id !== source.id),
	);
	const movedNames = [source.name, ...listUserAliases(source)];

	if (
		listUserAliases(target).length + movedNames.length >
		ingredientDictionaryLimits.maxUserAliases
	) {
		throw new UserFacingError(
			`呼び名は、1つの材料に${ingredientDictionaryLimits.maxUserAliases}個までです`,
		);
	}

	for (const name of movedNames) {
		rejectProblem(findIngredientNameProblem(withoutSource, name, target));
	}

	await repository.absorb(source.id, target.id);
}
