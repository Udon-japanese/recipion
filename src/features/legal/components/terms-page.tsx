import {
	termsArticles,
	termsEnactedOn,
	termsIntro,
	termsUpdatedOn,
} from "../domain/terms-content";
import * as styles from "./terms-page.css";

// 利用規約。ログインしていなくても読める。
export function TermsPage() {
	return (
		<article className={styles.container}>
			<h1 className={styles.title}>れしぴょん 利用規約</h1>
			<p className={styles.meta}>
				制定日：{termsEnactedOn}　最終更新日：{termsUpdatedOn}
			</p>

			{termsIntro.map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}

			{termsArticles.map((article) => (
				<section key={article.title}>
					<h2 className={styles.articleTitle}>{article.title}</h2>
					<ol className={styles.list}>
						{article.items.map((item) => (
							<li key={item} className={styles.multiline}>
								{item}
							</li>
						))}
					</ol>
				</section>
			))}
		</article>
	);
}
