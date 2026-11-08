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
	// 在庫に登録されているか（あると、消せない・管理しないにできない）。
	hasInventory: boolean;
	// 「管理しない」材料（水など）。レシピ→買い物メモの候補にせず、「つくった」で引かない。
	unmanaged: boolean;
};

export type IngredientDictionary = {
	readonly entries: readonly IngredientDictionaryEntry[];
	// 名前（呼び名を含む）から、辞書の代表の名前を引く。辞書にない名前は undefined。
	findCanonicalName(name: string): string | undefined;
	// 名前（呼び名を含む）が「管理しない」材料か。
	isUnmanaged(name: string): boolean;
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
	const entryByKey = new Map<string, IngredientDictionaryEntry>();

	for (const entry of entries) {
		for (const name of [entry.name, ...entry.aliases]) {
			const key = normalizeOrNull(name);

			if (key !== null && !entryByKey.has(key)) {
				entryByKey.set(key, entry);
			}
		}
	}

	const find = (name: string) => {
		const key = normalizeOrNull(name);

		return key === null ? undefined : entryByKey.get(key);
	};

	return {
		entries,
		findCanonicalName(name) {
			return find(name)?.name;
		},
		isUnmanaged(name) {
			return find(name)?.unmanaged === true;
		},
	};
}

// 名前の終わりの、括弧つきの説明（「鶏もも肉(大きめ)」の「(大きめ)」）。
const trailingNotePattern = /^(?<base>.+?)\s*\([^()]*\)$/u;

// 名前そのままで、辞書かカタログにあれば、その名前（辞書は代表の名前）。なければ undefined。
function findKnownName(
	name: string,
	dictionary: IngredientDictionary | undefined,
): string | undefined {
	return (
		dictionary?.findCanonicalName(name) ??
		(findIngredientCatalogEntry(name) ? name : undefined)
	);
}

// 照合に使う名前：辞書にあれば代表の名前、カタログにあれば、そのまま。
// どちらにもなく、名前が括弧で終わるとき（「鶏もも肉(大きめ)」）は、括弧を除いた名前で探す。
// 括弧ごとで1つの名前（「冷凍玉ねぎ(みじん切り)」）は、先に名前そのままで当たる。どこにも当たらなければ、そのまま。
export function toCanonicalIngredientName(
	name: string,
	dictionary: IngredientDictionary | undefined,
): string {
	const known = findKnownName(name, dictionary);

	if (known !== undefined) {
		return known;
	}

	const base = name.normalize("NFKC").match(trailingNotePattern)?.groups?.base;

	return (base && findKnownName(base, dictionary)) || name;
}

// 「管理しない」材料か（辞書がなければ、どれも管理する）。名前の括弧の説明は、照合の名前と同じく除いて見る。
export function isUnmanagedIngredient(
	name: string,
	dictionary: IngredientDictionary | undefined,
): boolean {
	return (
		dictionary?.isUnmanaged(toCanonicalIngredientName(name, dictionary)) ??
		false
	);
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
