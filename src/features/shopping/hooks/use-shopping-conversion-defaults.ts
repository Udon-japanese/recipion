import { useEffect, useRef, useState } from "react";
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";
import {
	findConversionDefault,
	planConversionMemoryUpdate,
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	type ShoppingConversionMemoryValue,
} from "../domain/shopping-conversion-default";

type UseShoppingConversionDefaultsOptions = {
	repository: ShoppingConversionDefaultRepository;
	// 記憶した時刻（ミリ秒）。テストで差し替える。
	now?: () => number;
	// 新しい記憶の鍵（ID）。テストで差し替える。
	createKey?: () => string;
};

// ユーザーが決めた在庫換算の記憶（食材×単位×換算ごと。食材ごとに上限あり）。記憶の読み書きに失敗しても、買い物メモの操作は止めない。
export function useShoppingConversionDefaults({
	repository,
	now = Date.now,
	createKey = () => crypto.randomUUID(),
}: UseShoppingConversionDefaultsOptions) {
	const [defaults, setDefaults] = useState<ShoppingConversionDefaults>({});
	// 続けて覚えるとき（購入確定で複数の商品など）に、前の結果を踏まえるための、いまの記憶。
	const defaultsRef = useRef(defaults);

	defaultsRef.current = defaults;

	useEffect(() => {
		let isActive = true;

		repository
			.list()
			.then((loaded) => {
				if (isActive) {
					setDefaults(loaded);
				}
			})
			.catch(() => {
				// 読めなければ、記憶なしとして動く（単位のない行は、カタログの既定の単位）。
			});

		return () => {
			isActive = false;
		};
	}, [repository]);

	// 食材×単位に対する記憶（その単位で、いちばん新しいもの。なければ undefined）。
	function lookup(
		itemName: string,
		unitLabel: string | null,
	): ShoppingConversionDefault | undefined {
		return findConversionDefault(defaults, itemName, unitLabel);
	}

	// 記憶する。同じ中身があれば使った時刻だけを新しくし、食材ごとの上限を超えた古い記憶は消す。
	// 覚えた時刻が、食材のいつもの単位を決める。
	async function remember(
		itemName: string,
		value: ShoppingConversionMemoryValue,
	) {
		const update = planConversionMemoryUpdate(
			defaultsRef.current,
			itemName,
			value,
			{
				now: now(),
				createKey,
			},
		);

		if (!update) {
			return;
		}

		try {
			await repository.set(update.key, update.entry);

			if (update.removedKeys.length > 0) {
				await repository.remove(update.removedKeys);
			}

			const next = { ...defaultsRef.current, [update.key]: update.entry };

			for (const key of update.removedKeys) {
				delete next[key];
			}

			defaultsRef.current = next;
			setDefaults(next);
		} catch {
			// 記憶できなくても、購入確定などの操作は、成功させる。
		}
	}

	return { defaults, lookup, remember };
}
