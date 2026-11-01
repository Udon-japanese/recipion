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
export function RoutePending() {
	return (
		<output className={styles.root}>
			<Mascot size={56} motion="loop" />
			よみこみ中...
		</output>
	);
}
