import { useRouter, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Mascot } from "../mascot/mascot";
import * as styles from "./route-pending.css";

// 画面の読み込み待ちに出すまでの時間と、出したら最低限出しておく時間（速い読み込みで、ちらつかせない）。
// 既定（1000ms）では、待っても何も出ない時間が長すぎるため、短くする。
export const routePendingOptions = {
	defaultPendingMs: 300,
	defaultPendingMinMs: 500,
} as const;

// 全画面に共通の、読み込み中の表示（ルーターの defaultPendingComponent）。
// 静的シェル（dist/client/_shell.html）でも、JS が動くまで、中身の場所にこれが出る。
// アプリを開いて最初の読み込みでは、ヘッダー・ナビも覆う全画面にする（OS のスプラッシュから、つなげて見せる）。
export function RoutePending() {
	const router = useRouter();
	const resolvedOnce = useRouterState({
		select: (state) => state.resolvedLocation !== undefined,
	});
	// サーバーの描画は、いつも最初の読み込み（ハイドレーションで食い違わないよう、サーバーでは全画面に決める）。
	// 出ている間に読み込みが終わっても切り替えない（消える直前に形が変わらないよう、出したときの形を保つ）。
	const [launch] = useState(() => router.isServer || !resolvedOnce);

	return (
		<output
			className={launch ? styles.launch : styles.root}
			data-launch={launch || undefined}
		>
			<Mascot size={56} motion="loop" />
			よみこみ中...
		</output>
	);
}
