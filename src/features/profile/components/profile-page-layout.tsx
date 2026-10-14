import type { ReactNode } from "react";
import * as styles from "./profile-page-layout.css";

// プロフィールの画面の、縦の並びと幅。
export function ProfilePageLayout({ children }: { children: ReactNode }) {
	return <div className={styles.page}>{children}</div>;
}

// ログアウトの置き場。
export function ProfileSignOutArea({ children }: { children: ReactNode }) {
	return <div className={styles.signOut}>{children}</div>;
}
