import * as styles from "./admin-history-list.css";

export type AdminHistoryItem = {
	id: string;
	// 見出し（レシピの名前、ユーザーの名前など）。
	title: string;
	// 小さく出す補足（投稿者、理由、日時など）。
	meta: string[];
	// 対応の内容（「非公開にした」など）。
	resolutionLabel: string;
	// ISO 8601
	resolvedAt: string;
	// 本文（通報の詳細、申し立てのメッセージなど）。
	detail?: string;
};

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

// 対応済みの履歴（新しい順）。閉じた状態で置く。
export function AdminHistoryList({
	heading,
	items,
}: {
	heading: string;
	items: readonly AdminHistoryItem[];
}) {
	return (
		<details className={styles.container}>
			<summary className={styles.summary}>
				{heading}（{items.length}件）
			</summary>

			{items.length === 0 ? <p>対応済みのものは、まだありません。</p> : null}

			<ul className={styles.list}>
				{items.map((item) => (
					<li className={styles.item} key={item.id}>
						<p className={styles.title}>{item.title}</p>
						<p className={styles.meta}>
							{[
								...item.meta,
								`${item.resolutionLabel}（${formatDateTime(item.resolvedAt)}）`,
							].join("・")}
						</p>
						{item.detail ? (
							<p className={styles.detail}>{item.detail}</p>
						) : null}
					</li>
				))}
			</ul>
		</details>
	);
}
