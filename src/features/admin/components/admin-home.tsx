import { Link } from "@tanstack/react-router";
import * as styles from "./admin-history-list.css";

type AdminHomeProps = {
	openReports: number;
	openAppeals: number;
	openUserReports: number;
};

// 管理者の入口：未対応の件数と、各画面へのリンク。
export function AdminHome({
	openReports,
	openAppeals,
	openUserReports,
}: AdminHomeProps) {
	return (
		<main className={styles.container}>
			<h1>管理の入口</h1>

			<ul className={styles.list}>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/reports" reloadDocument>
							通報
						</Link>
					</p>
					<p className={styles.meta}>未対応：{openReports}件</p>
				</li>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/user-reports" reloadDocument>
							ユーザー名の通報
						</Link>
					</p>
					<p className={styles.meta}>未対応：{openUserReports}件</p>
				</li>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/appeals" reloadDocument>
							停止への申し立て
						</Link>
					</p>
					<p className={styles.meta}>未対応：{openAppeals}件</p>
				</li>
				<li className={styles.item}>
					<p className={styles.title}>
						<Link to="/admin/users" search={{ q: "" }} reloadDocument>
							ユーザー
						</Link>
					</p>
					<p className={styles.meta}>探して、停止・永久停止・解除をする</p>
				</li>
			</ul>
		</main>
	);
}
