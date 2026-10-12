import {
	privacyEnactedOn,
	privacyIntro,
	privacySections,
	privacyUpdatedOn,
} from "../domain/privacy-content";
import * as styles from "./terms-page.css";

// プライバシーポリシー。ログインしていなくても読める（見た目は、利用規約と同じ）。
export function PrivacyPage() {
	return (
		<article className={styles.container}>
			<h1 className={styles.title}>れしぴょん プライバシーポリシー</h1>
			<p className={styles.meta}>
				制定日：{privacyEnactedOn}　最終更新日：{privacyUpdatedOn}
			</p>

			{privacyIntro.map((paragraph) => (
				<p key={paragraph}>{paragraph}</p>
			))}

			{privacySections.map((section) => (
				<section key={section.title}>
					<h2 className={styles.articleTitle}>{section.title}</h2>
					<ul className={styles.list}>
						{section.items.map((item) => (
							<li key={item} className={styles.multiline}>
								{item}
							</li>
						))}
					</ul>
				</section>
			))}
		</article>
	);
}
