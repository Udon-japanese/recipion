import { toIngredientMemoryKey } from "#/features/ingredients/domain/ingredient-catalog";
import { storageKeys } from "#/local-storage/keys";
import {
	defineStorageItem,
	type KeyValueStorage,
} from "#/local-storage/storage-item";
import {
	findMeasureUnit,
	type MeasureKind,
	measureUnitLabel,
} from "../domain/measure-units";

// 食材ごとに、量の欄で最後に選んだ重さ・体積の単位（g か kg、ml か L）を覚える（この端末だけに保存する）。
// 量の欄の既定の単位と、買い物メモの単位のチップの文字に使う。買い物メモと在庫で共通。

// 「食材のキー|weight」→ 1000 倍の単位（kg・L）を選んだか。
type PreferenceByKey = Record<string, boolean>;

function toKey(ingredientName: string, kind: MeasureKind): string {
	return `${toIngredientMemoryKey(ingredientName)}|${kind}`;
}

function parsePreferences(raw: string): PreferenceByKey | undefined {
	const parsed: unknown = JSON.parse(raw);

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return undefined;
	}

	return Object.fromEntries(
		Object.entries(parsed).filter(
			(entry): entry is [string, boolean] => typeof entry[1] === "boolean",
		),
	);
}

export const measureUnitPreferenceItem = defineStorageItem<PreferenceByKey>({
	key: storageKeys.measureUnitPreference,
	defaultValue: {},
	parse: parsePreferences,
	serialize: (preferences) => JSON.stringify(preferences),
});

/** 重さ・体積の単位を選んだことを覚える（g・kg・ml・cc・L のときだけ。食材名が空なら、覚えない）。 */
export function rememberMeasureUnit(
	ingredientName: string,
	unitLabel: string,
	storage?: KeyValueStorage | null,
): void {
	const found = findMeasureUnit(unitLabel);

	if (!found || ingredientName.trim() === "") {
		return;
	}

	measureUnitPreferenceItem.write(
		{
			...measureUnitPreferenceItem.read(storage),
			[toKey(ingredientName, found.kind)]: found.isLarger,
		},
		storage,
	);
}

/**
 * 重さ・体積の単位を、その食材で最後に選んだ方にする（g → kg など）。
 * 覚えていない食材・重さや体積でない単位は、そのまま。
 */
export function preferMeasureUnit(
	ingredientName: string,
	unitLabel: string,
	storage?: KeyValueStorage | null,
): string {
	const found = findMeasureUnit(unitLabel);

	if (!found || ingredientName.trim() === "") {
		return unitLabel;
	}

	const isLarger =
		measureUnitPreferenceItem.read(storage)[toKey(ingredientName, found.kind)];

	return isLarger === undefined || isLarger === found.isLarger
		? unitLabel
		: measureUnitLabel(found.kind, isLarger);
}
