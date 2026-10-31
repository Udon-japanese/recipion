import type { ReactNode } from "react";
import { ExpiryEstimateSetting } from "#/features/inventory/components/expiry-estimate-setting";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import * as styles from "./settings-page.css";

type SettingsPageProps = {
	// アカウントの欄（ログインしているときだけ渡す）。
	account?: ReactNode;
};

// 設定の画面。カテゴリごとに見出しで分ける。在庫の設定は、この端末だけに保存する（ログインしていなくても開ける）。
export function SettingsPage({ account }: SettingsPageProps) {
	const [expiryEstimateLevel, setExpiryEstimateLevel] =
		useExpiryEstimateLevel();

	return (
		<div className={styles.page}>
			<h1 className={styles.title}>設定</h1>

			<section className={styles.section} aria-labelledby="settings-inventory">
				<div className={styles.sectionHead}>
					<h2 className={styles.sectionTitle} id="settings-inventory">
						在庫
					</h2>
					<p className={styles.sectionNote}>この端末に保存</p>
				</div>
				<ExpiryEstimateSetting
					level={expiryEstimateLevel}
					onChange={setExpiryEstimateLevel}
				/>
			</section>

			{account}
		</div>
	);
}
