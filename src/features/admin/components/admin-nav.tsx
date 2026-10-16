import { Link } from "@tanstack/react-router";
import * as styles from "./admin-nav.css";

// 管理者の画面の上に出すナビ。一般のナビには出さない。
export function AdminNav() {
	const links = [
		{ to: "/admin", label: "管理の入口", exact: true },
		{ to: "/admin/reports", label: "通報", exact: false },
		{ to: "/admin/user-reports", label: "ユーザー名の通報", exact: false },
		{ to: "/admin/appeals", label: "停止への申し立て", exact: false },
		{ to: "/admin/users", label: "ユーザー", exact: false },
	] as const;

	return (
		<nav className={styles.nav} aria-label="管理者のメニュー">
			{links.map((item) => (
				<Link
					className={styles.link}
					activeProps={{ className: `${styles.link} ${styles.currentLink}` }}
					activeOptions={{ exact: item.exact }}
					to={item.to}
					// 管理者の画面は、ページとして読み込み直す（Cloudflare Access のログインは、ページの読み込みのときだけ求められるため）。
					reloadDocument
					// ユーザーの画面は、検索の条件（空）が要る。
					search={item.to === "/admin/users" ? { q: "" } : undefined}
					key={item.to}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
