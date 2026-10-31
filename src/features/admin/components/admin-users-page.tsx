import { type SubmitEvent, useState } from "react";
import {
	type AdminUserSummary,
	type LiftSuspensionResult,
	type SuspendUserResult,
	suspensionReasonMaxLength,
} from "../domain/admin-user";
import * as styles from "./admin-users-page.css";

type SuspendInput = {
	userId: string;
	reason: string;
	ban: boolean;
	makePrivate: boolean;
};

type AdminUsersPageProps = {
	users: readonly AdminUserSummary[];
	// 検索の欄の初期値。
	query: string;
	onSearch: (query: string) => void;
	onSuspend: (input: SuspendInput) => Promise<SuspendUserResult>;
	onLift: (userId: string) => Promise<LiftSuspensionResult>;
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

// 管理者の画面：ユーザーを探して、停止・永久停止・解除をする。
export function AdminUsersPage({
	users,
	query,
	onSearch,
	onSuspend,
	onLift,
}: AdminUsersPageProps) {
	const [searchText, setSearchText] = useState(query);
	// 停止の入力を開いているユーザーと、入力の内容。
	const [openUserId, setOpenUserId] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [makePrivate, setMakePrivate] = useState(true);
	// 永久停止・解除は、確認の2段階。
	const [confirming, setConfirming] = useState<{
		userId: string;
		kind: "ban" | "lift";
	} | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function handleSearch(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		onSearch(searchText.trim());
	}

	function closeForms() {
		setOpenUserId(null);
		setReason("");
		setMakePrivate(true);
		setConfirming(null);
	}

	async function handleSuspend(userId: string, ban: boolean) {
		if (reason.trim() === "") {
			setErrorMessage("停止の理由を入力してください");

			return;
		}

		setBusyId(userId);
		setErrorMessage(null);
		setMessage(null);

		try {
			const result = await onSuspend({
				userId,
				reason,
				ban,
				makePrivate,
			});

			if (result === "protected") {
				setErrorMessage("管理者のアカウントは停止できません");
			} else if (result === "not-found") {
				setErrorMessage("ユーザーが見つかりません");
			} else {
				setMessage(ban ? "永久停止にしました" : "停止しました");
				closeForms();
			}
		} catch {
			setErrorMessage("停止できませんでした。もう一度お試しください");
		} finally {
			setBusyId(null);
		}
	}

	async function handleLift(userId: string) {
		setBusyId(userId);
		setErrorMessage(null);
		setMessage(null);

		try {
			const result = await onLift(userId);

			setMessage(
				result === "done" ? "停止を解除しました" : "停止されていません",
			);
			closeForms();
		} catch {
			setErrorMessage("解除できませんでした。もう一度お試しください");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section className={styles.container}>
			<h1 className={styles.title}>ユーザー</h1>

			<form className={styles.searchForm} onSubmit={handleSearch}>
				<label className={styles.searchLabel} htmlFor="admin-user-search">
					表示名・ハンドルで探す
				</label>
				<input
					className={styles.searchInput}
					id="admin-user-search"
					value={searchText}
					placeholder="空欄なら新しく登録した順"
					onChange={(event) => setSearchText(event.target.value)}
				/>
				<button className={styles.button} type="submit">
					探す
				</button>
			</form>

			{message ? <output className={styles.meta}>{message}</output> : null}

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{users.length === 0 ? <p>該当するユーザーはいません。</p> : null}

			<ul className={styles.list}>
				{users.map((target) => {
					const isBusy = busyId === target.id;
					const isOpen = openUserId === target.id;

					return (
						<li className={styles.item} key={target.id}>
							<p className={styles.userName}>
								{target.name}（@{target.handle}）
								{target.suspension ? (
									<span className={styles.badge}>
										{target.suspension.status === "banned"
											? "永久停止中"
											: "停止中"}
									</span>
								) : null}
							</p>
							<p className={styles.meta}>
								{`登録日 ${formatDate(target.createdAt)}・公開のレシピ ${target.publicRecipeCount}件・違反 ${target.violationCount}回・通報された ${target.reportedCount}件`}
							</p>
							{target.suspension ? (
								<p className={styles.meta}>
									停止の理由：{target.suspension.reason}（
									{formatDate(target.suspension.suspendedAt)}）
								</p>
							) : null}

							<div className={styles.actions}>
								{target.suspension ? (
									confirming?.userId === target.id &&
									confirming.kind === "lift" ? (
										<>
											<button
												className={styles.button}
												type="button"
												disabled={isBusy}
												onClick={() => void handleLift(target.id)}
											>
												本当に解除する
											</button>
											<button
												className={styles.button}
												type="button"
												onClick={() => setConfirming(null)}
											>
												やめる
											</button>
										</>
									) : (
										<button
											className={styles.button}
											type="button"
											disabled={isBusy}
											onClick={() =>
												setConfirming({ userId: target.id, kind: "lift" })
											}
										>
											{target.suspension.status === "banned"
												? "永久停止を解除する"
												: "停止を解除する"}
										</button>
									)
								) : isOpen ? null : (
									<button
										className={styles.button}
										type="button"
										disabled={isBusy}
										onClick={() => {
											closeForms();
											setOpenUserId(target.id);
										}}
									>
										停止する…
									</button>
								)}
							</div>

							{isOpen && !target.suspension ? (
								<div className={styles.form}>
									<label className={styles.field}>
										<span className={styles.meta}>
											停止の理由（管理者の記録です。本人には表示されません）
										</span>
										<textarea
											className={styles.textarea}
											aria-label={`${target.name}の停止の理由`}
											value={reason}
											maxLength={suspensionReasonMaxLength}
											onChange={(event) => setReason(event.target.value)}
										/>
									</label>

									<label className={styles.check}>
										<input
											type="checkbox"
											checked={makePrivate}
											onChange={(event) => setMakePrivate(event.target.checked)}
										/>
										このユーザーの公開のレシピをすべて非公開にする
									</label>

									<div className={styles.actions}>
										<button
											className={styles.button}
											type="button"
											disabled={isBusy}
											onClick={() => void handleSuspend(target.id, false)}
										>
											停止する
										</button>

										{confirming?.userId === target.id &&
										confirming.kind === "ban" ? (
											<button
												className={`${styles.button} ${styles.dangerButton}`}
												type="button"
												disabled={isBusy}
												onClick={() => void handleSuspend(target.id, true)}
											>
												本当に永久停止にする
											</button>
										) : (
											<button
												className={`${styles.button} ${styles.dangerButton}`}
												type="button"
												disabled={isBusy}
												onClick={() =>
													setConfirming({ userId: target.id, kind: "ban" })
												}
											>
												永久停止にする
											</button>
										)}

										<button
											className={styles.button}
											type="button"
											onClick={closeForms}
										>
											やめる
										</button>
									</div>
								</div>
							) : null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
