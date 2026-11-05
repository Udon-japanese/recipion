import { findIngredientCatalogEntry } from "./ingredient-catalog";
import { normalizeIngredientName } from "./normalize-ingredient-name";

// ユーザーの食材辞書：自分の食材（在庫に登録したもの・設定で足したもの）と、その呼び名。
// レシピ・在庫・買い物メモの照合と補完に使う。原文（本文・メモの文字）は書き換えず、比べるときだけ通す。

export const ingredientDictionaryLimits = {
	maxNameLength: 50,
	// 1つの食材に、自分で足せる呼び名の数（カタログの別名は数えない）。
	maxUserAliases: 20,
	maxIngredients: 500,
} as const;

export type IngredientDictionaryEntry = {
	id: string;
	// 代表の名前（在庫・設定に出す名前）。
	name: string;
	// 呼び名（代表の名前は含めない）。カタログの食材は、カタログの別名も入っている（在庫の登録で入る）。
	aliases: readonly string[];
	// 在庫に登録されているか（あると、消せない）。
	hasInventory: boolean;
};

export type IngredientDictionary = {
	readonly entries: readonly IngredientDictionaryEntry[];
	// 名前（呼び名を含む）から、辞書の代表の名前を引く。辞書にない名前は undefined。
	findCanonicalName(name: string): string | undefined;
};

function normalizeOrNull(name: string): string | null {
	try {
		return normalizeIngredientName(name);
	} catch {
		// 空の名前など。
		return null;
	}
}

export function createIngredientDictionary(
	entries: readonly IngredientDictionaryEntry[],
): IngredientDictionary {
	const canonicalByKey = new Map<string, string>();

	for (const entry of entries) {
		for (const name of [entry.name, ...entry.aliases]) {
			const key = normalizeOrNull(name);

			if (key !== null && !canonicalByKey.has(key)) {
				canonicalByKey.set(key, entry.name);
			}
		}
	}

	return {
		entries,
		findCanonicalName(name) {
			const key = normalizeOrNull(name);

			return key === null ? undefined : canonicalByKey.get(key);
		},
	};
}

// 照合に使う名前：辞書にあれば代表の名前、なければ、そのまま（辞書がなければ、今までどおり）。
export function toCanonicalIngredientName(
	name: string,
	dictionary: IngredientDictionary | undefined,
): string {
	return dictionary?.findCanonicalName(name) ?? name;
}

// 食材が自分で足した呼び名（カタログの別名を除く）。設定に出し、消せるのは、これだけ。
export function listUserAliases(entry: IngredientDictionaryEntry): string[] {
	const catalogId = findIngredientCatalogEntry(entry.name)?.id;

	return entry.aliases.filter(
		(alias) =>
			catalogId === undefined ||
			findIngredientCatalogEntry(alias)?.id !== catalogId,
	);
}

export type IngredientNameProblem =
	| { kind: "empty" }
	| { kind: "too-long" }
	// 辞書のほかの食材（または、この食材）の名前・呼び名になっている。
	| { kind: "taken"; ingredientName: string }
	// カタログの、別の食材の名前・別名（在庫の登録で、2つの食材が同じ別名を持ってしまうため）。
	| { kind: "catalog"; catalogName: string }
	| { kind: "too-many" };

// 名前・呼び名を使えるか。target は、呼び名を足す・名前を変える食材（新しく作るときは undefined）。
// 名前を変えるときは、自分の呼び名を名前にしてよい（allowOwnName）。
export function findIngredientNameProblem(
	dictionary: IngredientDictionary,
	name: string,
	target?: IngredientDictionaryEntry,
	{ allowOwnName = false }: { allowOwnName?: boolean } = {},
): IngredientNameProblem | null {
	const key = normalizeOrNull(name);

	if (key === null) {
		return { kind: "empty" };
	}

	if (name.trim().length > ingredientDictionaryLimits.maxNameLength) {
		return { kind: "too-long" };
	}

	const owner = dictionary.entries.find((entry) =>
		[entry.name, ...entry.aliases].some(
			(candidate) => normalizeOrNull(candidate) === key,
		),
	);

	if (owner && !(allowOwnName && owner.id === target?.id)) {
		return { kind: "taken", ingredientName: owner.name };
	}

	const catalogEntry = findIngredientCatalogEntry(name);

	if (catalogEntry) {
		const targetCatalogId = target
			? findIngredientCatalogEntry(target.name)?.id
			: undefined;

		// 新しく作るときは、カタログの名前で作る（カタログの別名が、まとめて入る）ので、問題ない。
		if (target && targetCatalogId !== catalogEntry.id) {
			return { kind: "catalog", catalogName: catalogEntry.name };
		}
	}

	return null;
}

// 呼び名を足せるか（名前の問題に加えて、数の上限）。
export function findAliasProblem(
	dictionary: IngredientDictionary,
	target: IngredientDictionaryEntry,
	alias: string,
): IngredientNameProblem | null {
	if (
		listUserAliases(target).length >= ingredientDictionaryLimits.maxUserAliases
	) {
		return { kind: "too-many" };
	}

	return findIngredientNameProblem(dictionary, alias, target);
}

// 画面に出す文。
export function describeIngredientNameProblem(
	problem: IngredientNameProblem,
): string {
	switch (problem.kind) {
		case "empty":
			return "名前を入力してください";
		case "too-long":
			return `名前は${ingredientDictionaryLimits.maxNameLength}文字までです`;
		case "taken":
			return `「${problem.ingredientName}」の名前か呼び名として、もう使われています`;
		case "catalog":
			return `「${problem.catalogName}」と同じ名前のため、呼び名にできません`;
		case "too-many":
			return `呼び名は、1つの材料に${ingredientDictionaryLimits.maxUserAliases}個までです`;
	}
}
