import { useState } from "react";
import {
	type AdminHistoryItem,
	AdminHistoryList,
} from "#/features/admin/components/admin-history-list";
import {
	type AppealAction,
	appealActionLabels,
	appealResolutionLabels,
	appealVerdictLabels,
	type OpenAppeal,
	type ResolvedAppeal,
} from "../domain/appeal";
import * as styles from "./admin-appeals-page.css";

type AdminAppealsPageProps = {
	appeals: readonly OpenAppeal[];
	// 対応済みの申し立ての履歴（新しい順）。
	resolved?: readonly ResolvedAppeal[];
	onResolve: (
		appealId: string,
		action: AppealAction,
	) => Promise<"done" | "not-found">;
};

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

// 管理者の画面：停止への申し立てを、古い順に表示して、対応する。AI の見立ては参考で、決めるのは管理者。
export function AdminAppealsPage({
	resolved = [],
	appeals,
	onResolve,
}: AdminAppealsPageProps) {
	const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	// 永久停止は、確認の2段階（取り消せないため）。
	const [confirmingBanId, setConfirmingBanId] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const openAppeals = appeals.filter((appeal) => !resolvedIds.has(appeal.id));

	async function handleResolve(appealId: string, action: AppealAction) {
		setBusyId(appealId);
		setErrorMessage(null);

		try {
			await onResolve(appealId, action);
			setResolvedIds((current) => new Set([...current, appealId]));
			setConfirmingBanId(null);
		} catch {
			setErrorMessage("対応できませんでした。もう一度お試しください");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>停止への申し立て（未対応）</h1>

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{openAppeals.length === 0 ? <p>未対応の申し立てはありません。</p> : null}

			<ul className={styles.list}>
				{openAppeals.map((appeal) => {
					const isBusy = busyId === appeal.id;

					return (
						<li className={styles.item} key={appeal.id}>
							<p className={styles.meta}>
								{appeal.userName}
								{appeal.userHandle ? `（@${appeal.userHandle}）` : null}・
								{appeal.userEmail}・{formatDateTime(appeal.createdAt)}
							</p>
							<p className={styles.meta}>
								{appealVerdictLabels[appeal.verdict]}
								{appeal.suspensionReason
									? `・停止の理由：${appeal.suspensionReason}`
									: null}
							</p>
							<p className={styles.detail}>{appeal.message}</p>

							<div className={styles.actions}>
								<button
									className={styles.button}
									type="button"
									disabled={isBusy}
									onClick={() => void handleResolve(appeal.id, "lift")}
								>
									{appealActionLabels.lift}
								</button>
								<button
									className={styles.button}
									type="button"
									disabled={isBusy}
									onClick={() => void handleResolve(appeal.id, "reject")}
								>
									{appealActionLabels.reject}
								</button>

								{confirmingBanId === appeal.id ? (
									<>
										<button
											className={`${styles.button} ${styles.dangerButton}`}
											type="button"
											disabled={isBusy}
											onClick={() => void handleResolve(appeal.id, "ban")}
										>
											本当に永久停止にする
										</button>
										<button
											className={styles.button}
											type="button"
											onClick={() => setConfirmingBanId(null)}
										>
											やめる
										</button>
									</>
								) : (
									<button
										className={`${styles.button} ${styles.dangerButton}`}
										type="button"
										disabled={isBusy}
										onClick={() => setConfirmingBanId(appeal.id)}
									>
										{appealActionLabels.ban}
									</button>
								)}
							</div>
						</li>
					);
				})}
			</ul>

			<AdminHistoryList
				heading="対応済みの申し立て"
				items={resolved.map(toHistoryItem)}
			/>
		</section>
	);
}

function toHistoryItem(appeal: ResolvedAppeal): AdminHistoryItem {
	return {
		id: appeal.id,
		title: `${appeal.userName}${appeal.userHandle ? `（@${appeal.userHandle}）` : ""}`,
		meta: [appealVerdictLabels[appeal.verdict]],
		resolutionLabel: appealResolutionLabels[appeal.resolution],
		resolvedAt: appeal.resolvedAt,
		detail: appeal.message,
	};
}
