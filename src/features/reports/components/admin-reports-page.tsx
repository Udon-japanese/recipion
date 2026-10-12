import { useState } from "react";
import {
	type AdminHistoryItem,
	AdminHistoryList,
} from "#/features/admin/components/admin-history-list";
import type { RecipeDetail } from "#/features/recipes/application/recipe-repository";
import { RecipeView } from "#/features/recipes/components/recipe-view";
import {
	type OpenReport,
	type ReportAction,
	type ResolvedReport,
	reportActionLabels,
	reportReasonLabels,
	reportResolutionLabels,
} from "../domain/report";
import * as styles from "./admin-reports-page.css";

type AdminReportsPageProps = {
	reports: readonly OpenReport[];
	// 対応済みの通報の履歴（新しい順）。
	resolved?: readonly ResolvedReport[];
	// 通報されたレシピの内容（削除されていれば null）。
	loadRecipe: (reportId: string) => Promise<RecipeDetail | null>;
	onResolve: (
		reportId: string,
		action: ReportAction,
	) => Promise<"done" | "not-found">;
};

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		timeZone: "Asia/Tokyo",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

// 管理者の画面：未対応の通報を、古い順に表示して、対応する。
export function AdminReportsPage({
	reports,
	resolved = [],
	loadRecipe,
	onResolve,
}: AdminReportsPageProps) {
	const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [recipes, setRecipes] = useState<
		Record<string, RecipeDetail | null | "loading">
	>({});
	// 削除は、確認の2段階（ブラウザの確認ダイアログは使わない）。
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
		null,
	);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const openReports = reports.filter((report) => !resolvedIds.has(report.id));

	async function handleView(reportId: string) {
		setRecipes((current) => ({ ...current, [reportId]: "loading" }));

		try {
			const recipe = await loadRecipe(reportId);

			setRecipes((current) => ({ ...current, [reportId]: recipe }));
		} catch {
			setRecipes((current) => {
				const { [reportId]: _removed, ...rest } = current;

				return rest;
			});
			setErrorMessage("レシピを読み込めませんでした");
		}
	}

	async function handleResolve(reportId: string, action: ReportAction) {
		setBusyId(reportId);
		setErrorMessage(null);

		try {
			await onResolve(reportId, action);
			// 「見つからない」（すでに対応済み）も、一覧から外す。
			setResolvedIds((current) => new Set([...current, reportId]));
			setConfirmingDeleteId(null);
		} catch {
			setErrorMessage("対応できませんでした。もう一度お試しください");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>通報の一覧（未対応）</h1>

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{openReports.length === 0 ? <p>未対応の通報は、ありません。</p> : null}

			<ul className={styles.list}>
				{openReports.map((report) => {
					const recipe = recipes[report.id];
					const isBusy = busyId === report.id;

					return (
						<li className={styles.item} key={report.id}>
							<p className={styles.recipeName}>
								{report.recipeName}
								{report.recipeExists ? null : "（削除済み）"}
							</p>
							<p className={styles.meta}>
								{reportReasonLabels[report.reason]}・
								{formatDateTime(report.createdAt)}
								{report.ownerHandle
									? `・作者：${report.ownerName}（@${report.ownerHandle}）`
									: null}
							</p>
							{report.detail === "" ? null : (
								<p className={styles.detail}>{report.detail}</p>
							)}

							<div className={styles.actions}>
								{report.recipeExists ? (
									<button
										className={styles.button}
										type="button"
										disabled={recipe === "loading"}
										onClick={() => void handleView(report.id)}
									>
										レシピを見る
									</button>
								) : null}

								{report.recipeExists ? (
									<button
										className={styles.button}
										type="button"
										disabled={isBusy}
										onClick={() =>
											void handleResolve(report.id, "make-private")
										}
									>
										{reportActionLabels["make-private"]}
									</button>
								) : null}

								{report.recipeExists && confirmingDeleteId === report.id ? (
									<>
										<button
											className={`${styles.button} ${styles.dangerButton}`}
											type="button"
											disabled={isBusy}
											onClick={() => void handleResolve(report.id, "delete")}
										>
											本当に削除する
										</button>
										<button
											className={styles.button}
											type="button"
											onClick={() => setConfirmingDeleteId(null)}
										>
											やめる
										</button>
									</>
								) : report.recipeExists ? (
									<button
										className={`${styles.button} ${styles.dangerButton}`}
										type="button"
										disabled={isBusy}
										onClick={() => setConfirmingDeleteId(report.id)}
									>
										{reportActionLabels.delete}
									</button>
								) : null}

								<button
									className={styles.button}
									type="button"
									disabled={isBusy}
									onClick={() => void handleResolve(report.id, "dismiss")}
								>
									{reportActionLabels.dismiss}
								</button>
							</div>

							{recipe === "loading" ? <p>読み込んでいます…</p> : null}
							{recipe ? (
								<div className={styles.preview}>
									{recipe === "loading" ? null : <RecipeView recipe={recipe} />}
								</div>
							) : null}
						</li>
					);
				})}
			</ul>

			<AdminHistoryList
				heading="対応済みの通報"
				items={resolved.map(toHistoryItem)}
			/>
		</section>
	);
}

function toHistoryItem(report: ResolvedReport): AdminHistoryItem {
	return {
		id: report.id,
		title: report.recipeName,
		meta: [
			report.ownerName
				? `${report.ownerName}${report.ownerHandle ? `（@${report.ownerHandle}）` : ""}`
				: "投稿者不明（削除済み）",
			reportReasonLabels[report.reason],
		],
		resolutionLabel: reportResolutionLabels[report.resolution],
		resolvedAt: report.resolvedAt,
		detail: report.detail || undefined,
	};
}
