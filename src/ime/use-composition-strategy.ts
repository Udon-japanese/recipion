import { useEffect, useState } from "react";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "./choose-composition-strategy";
import { readBrowserEnvironment } from "./read-browser-environment";

// 変換中の補完の方式。サーバーと同じ初期値で描画し、ブラウザで判定する。override はテストで指定する。
export function useCompositionStrategy(
	override?: CompositionStrategy,
): CompositionStrategy {
	const [detected, setDetected] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);

	useEffect(() => {
		setDetected(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);

	return override ?? detected;
}
