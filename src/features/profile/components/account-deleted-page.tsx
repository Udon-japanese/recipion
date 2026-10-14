import { ButtonLink } from "#/components/button/button-link";
import { Mascot } from "#/components/mascot/mascot";
import * as styles from "./account-deleted-page.css";

// アカウントを削除したあとの画面。
export function AccountDeletedPage() {
	return (
		<section className={styles.container}>
			<Mascot size={64} />
			<h1 className={styles.title}>アカウントを削除しました</h1>
			<p className={styles.text}>
				アカウントと、保存した情報を削除しました。ご利用ありがとうございました。
			</p>
			{/* 端末のデータを消したあとなので、ページを読み込み直して、最初の状態から始める。 */}
			<ButtonLink to="/" reloadDocument>
				トップへ
			</ButtonLink>
		</section>
	);
}
