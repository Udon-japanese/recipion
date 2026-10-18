import { ButtonLink } from "#/components/button/button-link";
import { Note } from "#/components/note/note";
import * as styles from "./not-found-page.css";

// ページが見つからないとき。管理者の画面に管理者以外が来たときも、同じ表示にする（画面があることを知らせない）。
export function NotFoundPage() {
	return (
		<div className={styles.wrapper}>
			<Note
				tone="neutral"
				action={
					<ButtonLink to="/" variant="secondary" size="sm">
						ホームへ
					</ButtonLink>
				}
			>
				ページが見つかりません。
			</Note>
		</div>
	);
}
