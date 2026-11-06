import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
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
