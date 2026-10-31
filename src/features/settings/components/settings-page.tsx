import { ExpiryEstimateSetting } from "#/features/inventory/components/expiry-estimate-setting";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import * as styles from "./settings-page.css";

// 設定の画面。どれも、この端末だけに保存する（ログインしていなくても開ける）。
export function SettingsPage() {
	const [expiryEstimateLevel, setExpiryEstimateLevel] =
		useExpiryEstimateLevel();

	return (
		<div className={styles.page}>
			<div className={styles.head}>
				<h1 className={styles.title}>設定</h1>
				<p className={styles.lead}>この端末に保存されます。</p>
			</div>

			<section className={styles.section} aria-labelledby="settings-inventory">
				<h2 className={styles.sectionTitle} id="settings-inventory">
					在庫
				</h2>
				<ExpiryEstimateSetting
					level={expiryEstimateLevel}
					onChange={setExpiryEstimateLevel}
				/>
			</section>
		</div>
	);
}
