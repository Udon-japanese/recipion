import { Link } from "@tanstack/react-router";
import * as styles from "./admin-history-list.css";

type AdminHomeProps = {
	openReports: number;
	openAppeals: number;
};

// 管理者の入口：未対応の件数と、各画面へのリンク。
export function AdminHome({ openReports, openAppeals }: AdminHomeProps) {
	return (
		<main className={styles.container}>
			<h1>管理の入口</h1>

			<ul className={styles.list}>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/reports">通報</Link>
					</p>
					<p className={styles.meta}>未対応：{openReports}件</p>
				</li>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/appeals">停止への申し立て</Link>
					</p>
					<p className={styles.meta}>未対応：{openAppeals}件</p>
				</li>
			</ul>
		</main>
	);
}
