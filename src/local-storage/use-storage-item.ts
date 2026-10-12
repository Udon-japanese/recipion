import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { StorageItem } from "./storage-item";

// 保存した項目を、画面で使う。サーバーと、最初の描画は、既定値。ブラウザで、保存した値に切り替わる（描画のずれが、起きない）。
// 他のタブでの変更、同じタブでの書き込みの、どちらでも、更新される。
export function useStorageItem<T>(
	item: StorageItem<T>,
): [T, (value: T) => void] {
	const raw = useSyncExternalStore(
		item.subscribe,
		() => item.readRaw(),
		() => null,
	);
	const value = useMemo(() => item.parseRaw(raw), [item, raw]);
	const setValue = useCallback(
		(next: T) => {
			item.write(next);
		},
		[item],
	);

	return [value, setValue];
}
