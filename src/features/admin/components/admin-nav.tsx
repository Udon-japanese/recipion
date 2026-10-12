import { Link } from "@tanstack/react-router";
import * as styles from "./admin-nav.css";

// 管理者の画面の上に出すナビ。一般のナビには出さない。
export function AdminNav() {
	const links = [
		{ to: "/admin", label: "管理の入口", exact: true },
		{ to: "/admin/reports", label: "通報", exact: false },
		{ to: "/admin/appeals", label: "停止への申し立て", exact: false },
	] as const;

	return (
		<nav className={styles.nav} aria-label="管理者のメニュー">
			{links.map((item) => (
				<Link
					className={styles.link}
					activeProps={{ className: `${styles.link} ${styles.currentLink}` }}
					activeOptions={{ exact: item.exact }}
					to={item.to}
					key={item.to}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
