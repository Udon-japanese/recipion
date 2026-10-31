import { useState } from "react";
import {
	type AdminHistoryItem,
	AdminHistoryList,
} from "#/features/admin/components/admin-history-list";
import {
	type OpenUserNameReport,
	type ResolvedUserNameReport,
	type UserNameReportAction,
	userNameReportActionLabels,
	userNameReportReasonLabels,
	userNameReportResolutionLabels,
} from "../domain/user-report";
import * as styles from "./admin-user-reports-page.css";

type AdminUserReportsPageProps = {
	reports: readonly OpenUserNameReport[];
	// 対応済みの通報の履歴（新しい順）。
	resolved?: readonly ResolvedUserNameReport[];
	onResolve: (
		reportId: string,
		action: UserNameReportAction,
	) => Promise<"done" | "not-found">;
};

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

// 退会したユーザーは、名前とハンドルの控えを消してある。
function formatReportedUser(report: OpenUserNameReport): string {
	return report.reportedHandle === ""
		? "（退会済みのユーザー）"
		: `${report.reportedName}（@${report.reportedHandle}）`;
}

function toHistoryItem(report: ResolvedUserNameReport): AdminHistoryItem {
	return {
		id: report.id,
		title: formatReportedUser(report),
		meta: [userNameReportReasonLabels[report.reason]],
		resolutionLabel: userNameReportResolutionLabels[report.resolution],
		resolvedAt: report.resolvedAt,
		detail: report.detail || undefined,
	};
}

// 管理者の画面：未対応のユーザー名の通報を、古い順に表示して、対応する。
export function AdminUserReportsPage({
	reports,
	resolved = [],
	onResolve,
}: AdminUserReportsPageProps) {
	const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	// 名前を戻すのは、確認の2段階（元の名前は残らないため）。
	const [confirmingResetId, setConfirmingResetId] = useState<string | null>(
		null,
	);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const openReports = reports.filter((report) => !resolvedIds.has(report.id));

	async function handleResolve(reportId: string, action: UserNameReportAction) {
		setBusyId(reportId);
		setErrorMessage(null);

		try {
			await onResolve(reportId, action);
			setResolvedIds((current) => new Set([...current, reportId]));
			setConfirmingResetId(null);
		} catch {
			setErrorMessage("対応できませんでした。もう一度お試しください");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>ユーザー名への通報（未対応）</h1>

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{openReports.length === 0 ? (
				<p>未対応のユーザー名の通報はありません。</p>
			) : null}

			<ul className={styles.list}>
				{openReports.map((report) => {
					const isBusy = busyId === report.id;
					const isChanged =
						report.currentHandle !== null &&
						(report.currentName !== report.reportedName ||
							report.currentHandle !== report.reportedHandle);

					return (
						<li className={styles.item} key={report.id}>
							<p className={styles.userName}>{formatReportedUser(report)}</p>
							<p className={styles.meta}>
								{userNameReportReasonLabels[report.reason]}・
								{formatDateTime(report.createdAt)}
							</p>
							{report.currentHandle === null ? (
								<p className={styles.meta}>
									このユーザーはすでに退会しています。
								</p>
							) : null}
							{isChanged ? (
								<p className={styles.meta}>
									いまの名前：{report.currentName}（@{report.currentHandle}）
								</p>
							) : null}
							{report.detail === "" ? null : (
								<p className={styles.detail}>{report.detail}</p>
							)}

							<div className={styles.actions}>
								{report.currentHandle !== null ? (
									confirmingResetId === report.id ? (
										<>
											<button
												className={`${styles.button} ${styles.dangerButton}`}
												type="button"
												disabled={isBusy}
												onClick={() =>
													void handleResolve(report.id, "reset-name")
												}
											>
												本当に戻す
											</button>
											<button
												className={styles.button}
												type="button"
												onClick={() => setConfirmingResetId(null)}
											>
												やめる
											</button>
										</>
									) : (
										<button
											className={styles.button}
											type="button"
											disabled={isBusy}
											onClick={() => setConfirmingResetId(report.id)}
										>
											{userNameReportActionLabels["reset-name"]}
										</button>
									)
								) : null}

								<button
									className={styles.button}
									type="button"
									disabled={isBusy}
									onClick={() => void handleResolve(report.id, "dismiss")}
								>
									{userNameReportActionLabels.dismiss}
								</button>

								{report.currentHandle !== null ? (
									<a
										href={`/admin/users?q=${encodeURIComponent(report.currentHandle)}`}
									>
										停止する（ユーザーの画面へ）
									</a>
								) : null}
							</div>
						</li>
					);
				})}
			</ul>

			<AdminHistoryList
				heading="対応済みのユーザー名の通報"
				items={resolved.map(toHistoryItem)}
			/>
		</section>
	);
}
