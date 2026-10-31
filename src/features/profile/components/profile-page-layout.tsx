import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Icon } from "#/components/icon/icon";
import * as styles from "./profile-page-layout.css";

// プロフィールの画面の、縦の並びと幅。
export function ProfilePageLayout({ children }: { children: ReactNode }) {
	return <div className={styles.page}>{children}</div>;
}

// ログアウト・アカウントの削除は、設定の画面にある。そこへの入り口。
export function ProfileSettingsLink() {
	return (
		<Link to="/settings" className={styles.settingsLink}>
			アカウントの設定
			<Icon name="chevron-right" size={16} />
		</Link>
	);
}
