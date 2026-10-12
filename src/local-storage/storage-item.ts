import * as v from "valibot";
import type { StorageKey } from "./keys";

// localStorage に、型のついた項目を保存する、共通の部品（React には依存しない。フックは use-storage-item.ts）。
// - 使えない環境（サーバー、プライベートモード、容量超過）でも、例外にせず、既定値で動く。使えないときは、そのタブの間だけ、メモリに覚える。
// - 壊れた値・古い形の値は、既定値に戻る（parse が undefined を返す）。
// - 他のタブでの変更（storage イベント）と、同じタブでの書き込みの、両方を購読できる。

export const storageKeyPrefix = "recipion:";

// removeItem は、なくてもよい（テストの、簡単な偽の保存領域でも使えるように）。
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem"> &
	Partial<Pick<Storage, "removeItem">>;

export type StorageItemSpec<T> = {
	key: StorageKey;
	// 既定値は、共有される（読むたびに、同じ値が返る）。オブジェクトは、書き換えずに、コピーして使うこと。
	defaultValue: T;
	// 保存された文字列を、値にする。使えない形は、undefined（既定値に戻る）。
	parse: (raw: string) => T | undefined;
	serialize: (value: T) => string;
};

export type StorageItem<T> = {
	readonly key: string;
	readonly defaultValue: T;
	// 保存された文字列そのもの（フックの購読に使う。なければ null）。
	readRaw: (storage?: KeyValueStorage | null) => string | null;
	// 文字列から値を作る（null・壊れた値は、既定値）。
	parseRaw: (raw: string | null) => T;
	read: (storage?: KeyValueStorage | null) => T;
	// 保存する。保存領域に書けたら true（書けなくても、そのタブの間は、値が効く）。
	write: (value: T, storage?: KeyValueStorage | null) => boolean;
	remove: (storage?: KeyValueStorage | null) => void;
	subscribe: (listener: () => void) => () => void;
};

function getDefaultStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

// 保存領域に書けなかったときの、このタブの間だけの控え。
const memoryFallback = new Map<string, string>();
const listenersByKey = new Map<string, Set<() => void>>();
let isStorageEventAttached = false;

function notify(fullKey: string): void {
	for (const listener of listenersByKey.get(fullKey) ?? []) {
		listener();
	}
}

// 他のタブでの変更を、受け取る（同じタブでの書き込みでは、storage イベントは届かないので、write で通知する）。
function attachStorageEvent(): void {
	if (isStorageEventAttached || typeof window === "undefined") {
		return;
	}

	isStorageEventAttached = true;
	window.addEventListener("storage", (event) => {
		// key が null は、全消去。
		if (event.key === null) {
			for (const fullKey of listenersByKey.keys()) {
				notify(fullKey);
			}

			return;
		}

		notify(event.key);
	});
}

export function defineStorageItem<T>(spec: StorageItemSpec<T>): StorageItem<T> {
	const fullKey = `${storageKeyPrefix}${spec.key}`;

	function resolveStorage(
		storage: KeyValueStorage | null | undefined,
	): KeyValueStorage | null {
		return storage === undefined ? getDefaultStorage() : storage;
	}

	function readRaw(storage?: KeyValueStorage | null): string | null {
		// 書けなかった値が、控えにあれば、それが、いまの値（控えは、既定の保存領域のときだけ使う）。
		const remembered =
			storage === undefined ? memoryFallback.get(fullKey) : undefined;

		if (remembered !== undefined) {
			return remembered;
		}

		try {
			return resolveStorage(storage)?.getItem(fullKey) ?? null;
		} catch {
			return null;
		}
	}

	function parseRaw(raw: string | null): T {
		if (raw === null) {
			return spec.defaultValue;
		}

		try {
			return spec.parse(raw) ?? spec.defaultValue;
		} catch {
			return spec.defaultValue;
		}
	}

	return {
		key: fullKey,
		defaultValue: spec.defaultValue,
		readRaw,
		parseRaw,
		read: (storage) => parseRaw(readRaw(storage)),
		write(value, storage) {
			const serialized = spec.serialize(value);
			let isPersisted = false;

			try {
				const target = resolveStorage(storage);

				if (target) {
					target.setItem(fullKey, serialized);
					isPersisted = true;
				}
			} catch {
				// 容量超過など。控えに持つ。
			}

			if (storage === undefined) {
				if (isPersisted) {
					memoryFallback.delete(fullKey);
				} else {
					memoryFallback.set(fullKey, serialized);
				}
			}

			notify(fullKey);

			return isPersisted;
		},
		remove(storage) {
			if (storage === undefined) {
				memoryFallback.delete(fullKey);
			}

			try {
				resolveStorage(storage)?.removeItem?.(fullKey);
			} catch {
				// 消せなくても、画面の操作は続ける。
			}

			notify(fullKey);
		},
		subscribe(listener) {
			attachStorageEvent();

			const listeners = listenersByKey.get(fullKey) ?? new Set();

			listeners.add(listener);
			listenersByKey.set(fullKey, listeners);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}

// JSON で保存する項目。Valibot で検証し、壊れた値・古い形は、既定値に戻る。
export function jsonStorageItem<T>(options: {
	key: StorageKey;
	defaultValue: T;
	schema: v.GenericSchema<unknown, T>;
}): StorageItem<T> {
	return defineStorageItem({
		key: options.key,
		defaultValue: options.defaultValue,
		parse: (raw) => {
			const result = v.safeParse(options.schema, JSON.parse(raw));

			return result.success ? result.output : undefined;
		},
		serialize: (value) => JSON.stringify(value),
	});
}

// 決まった文字列のどれか、で保存する項目。
export function enumStorageItem<const T extends string>(options: {
	key: StorageKey;
	values: readonly T[];
	defaultValue: T;
}): StorageItem<T> {
	return defineStorageItem<T>({
		key: options.key,
		defaultValue: options.defaultValue,
		parse: (raw) => options.values.find((value) => value === raw),
		serialize: (value) => value,
	});
}

// テスト用：控え（メモリ）と購読を空にする。
export function resetStorageItemsForTest(): void {
	memoryFallback.clear();
	listenersByKey.clear();
}
