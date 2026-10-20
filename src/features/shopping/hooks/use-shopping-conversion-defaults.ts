import { useEffect, useState } from "react";
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";
import {
	findConversionDefault,
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "../domain/shopping-conversion-default";

type UseShoppingConversionDefaultsOptions = {
	repository: ShoppingConversionDefaultRepository;
	// 記憶した時刻（ミリ秒）。テストで差し替える。
	now?: () => number;
};

// 食材×単位ごとに、ユーザーが決めた在庫換算の記憶。記憶の読み書きに失敗しても、買い物メモの操作は止めない。
export function useShoppingConversionDefaults({
	repository,
	now = Date.now,
}: UseShoppingConversionDefaultsOptions) {
	const [defaults, setDefaults] = useState<ShoppingConversionDefaults>({});

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

	// 食材×単位に対する記憶（なければ undefined）。
	function lookup(
		itemName: string,
		unitLabel: string | null,
	): ShoppingConversionDefault | undefined {
		return findConversionDefault(defaults, itemName, unitLabel);
	}

	// 記憶する（同じ食材×単位の記憶は、置き換える）。覚えた時刻が、食材のいつもの単位を決める。
	async function remember(itemName: string, value: ShoppingConversionDefault) {
		const nameKey = toConversionDefaultKey(itemName);

		if (!nameKey) {
			return;
		}

		const entry = { ...value, nameKey, usedAt: now() };

		try {
			await repository.set(entry);
			setDefaults((current) => ({
				...current,
				[toConversionMemoryKey(nameKey, value.unitLabel)]: entry,
			}));
		} catch {
			// 記憶できなくても、購入確定などの操作は、成功させる。
		}
	}

	return { defaults, lookup, remember };
}
