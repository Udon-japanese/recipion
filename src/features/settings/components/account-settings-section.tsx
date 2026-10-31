import type { ReactNode } from "react";
import * as styles from "./settings-page.css";

type AccountSettingsSectionProps = {
	email: string;
	// ログアウトのボタン。
	signOut: ReactNode;
	// アカウントの削除の欄。
	deletion: ReactNode;
};

// 設定の、アカウントのカテゴリ。ログイン中のメールアドレス・ログアウト・アカウントの削除。
export function AccountSettingsSection({
	email,
	signOut,
	deletion,
}: AccountSettingsSectionProps) {
	return (
		<section className={styles.section} aria-labelledby="settings-account">
			<h2 className={styles.sectionTitle} id="settings-account">
				アカウント
			</h2>
			<dl className={styles.email}>
				<dt className={styles.emailLabel}>
					ログイン中のメールアドレス（公開されません）
				</dt>
				<dd className={styles.emailValue}>{email}</dd>
			</dl>
			<div className={styles.signOut}>{signOut}</div>
			{deletion}
		</section>
	);
}
