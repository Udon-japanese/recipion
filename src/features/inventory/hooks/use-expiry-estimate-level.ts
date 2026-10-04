import { useCallback, useEffect, useState } from "react";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import {
	defaultExpiryEstimateLevel,
	readExpiryEstimateLevel,
	writeExpiryEstimateLevel,
} from "../infrastructure/expiry-estimate-level-storage";

// 期限の目安の設定（この端末に保存）。画面を作ったあとで、保存した値を読む（サーバーの描画と、ずれないように）。
export function useExpiryEstimateLevel(): [
	ExpiryEstimateLevel,
	(level: ExpiryEstimateLevel) => void,
] {
	const [level, setLevelState] = useState<ExpiryEstimateLevel>(
		defaultExpiryEstimateLevel,
	);

	useEffect(() => {
		setLevelState(readExpiryEstimateLevel());
	}, []);

	const setLevel = useCallback((nextLevel: ExpiryEstimateLevel) => {
		setLevelState(nextLevel);
		writeExpiryEstimateLevel(nextLevel);
	}, []);

	return [level, setLevel];
}
