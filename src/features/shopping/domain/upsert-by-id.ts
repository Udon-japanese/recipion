// 同じ ID があれば置き換え、なければ最後に足す。
// 購読（ライブデータ）からの更新が、画面の追加より先に届いても、二重にならないようにする。
export function upsertById<T extends { id: string }>(
	list: readonly T[],
	entry: T,
): T[] {
	return list.some((current) => current.id === entry.id)
		? list.map((current) => (current.id === entry.id ? entry : current))
		: [...list, entry];
}
