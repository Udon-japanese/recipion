import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type {
	InventoryPurchaseFailure,
	SyncInventoryPurchaseOutboxResult,
} from "../application/sync-inventory-purchase-outbox";

type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

type InventoryPurchaseSyncProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	syncPurchases: SyncPurchases;
	// 内容で断られた購入を、在庫に入れずに、端末から消す。
	discardPurchase?: (entryId: string) => Promise<void>;
};

type SyncState =
	| { status: "idle" }
	| { status: "syncing" }
	| { status: "done"; result: SyncInventoryPurchaseOutboxResult }
	// 同期そのものが失敗した（端末の DB が読めない、など）。
	| { status: "error" };

// 端末に貯めた購入を、在庫へ送る。開いたとき・通信が戻ったとき・画面に戻ったとき（スリープからの復帰も）に送り直す。
export function InventoryPurchaseSync({
	ownerScope,
	syncPurchases,
	discardPurchase,
}: InventoryPurchaseSyncProps) {
	const [state, setState] = useState<SyncState>({ status: "idle" });
	const [discarding, setDiscarding] = useState<InventoryPurchaseFailure | null>(
		null,
	);
	// いまの所有者（送っている間に、ログアウト・別の人に変わったら、古い結果を出さない）。
	const currentScope = useRef(ownerScope);

	useEffect(() => {
		currentScope.current = ownerScope;
		setState({ status: "idle" });
	}, [ownerScope]);

	const runSync = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			return;
		}

		setState({ status: "syncing" });

		let next: SyncState;

		try {
			next = { status: "done", result: await syncPurchases(ownerScope) };
		} catch {
			next = { status: "error" };
		}

		if (currentScope.current === ownerScope) {
			setState(next);
		}
	}, [ownerScope, syncPurchases]);

	useEffect(() => {
		void runSync();
	}, [runSync]);

	useEffect(() => {
		function handleOnline() {
			void runSync();
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				void runSync();
			}
		}

		window.addEventListener("online", handleOnline);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.removeEventListener("online", handleOnline);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [runSync]);

	async function confirmDiscard() {
		const failure = discarding;

		setDiscarding(null);

		if (!failure || !discardPurchase) {
			return;
		}

		await discardPurchase(failure.entryId);
		await runSync();
	}

	if (!ownerScope || ownerScope === "guest" || state.status === "idle") {
		return null;
	}

	if (state.status === "syncing") {
		return (
			<Note tone="info" spinning>
				在庫を同期しています…
			</Note>
		);
	}

	const retry = (
		<Button variant="secondary" size="sm" onClick={() => void runSync()}>
			在庫同期を再試行
		</Button>
	);

	if (state.status === "error") {
		return (
			<Note tone="warn" action={retry}>
				未反映の在庫があります
			</Note>
		);
	}

	const { result } = state;
	const rejected = result.failures.filter(
		(failure) => failure.kind === "rejected",
	);
	const serverFailureCount = result.failures.length - rejected.length;

	return (
		<>
			{result.syncedCount > 0 ? (
				<Note tone="success">{result.syncedCount}件の在庫を反映しました</Note>
			) : null}

			{result.stoppedBy === "offline" ? (
				<Note tone="neutral" icon="wifi-off" action={retry}>
					通信できないため、買ったものを在庫に入れていません。通信が戻ったら、もう一度送ります
				</Note>
			) : null}

			{result.stoppedBy === "account" ? (
				<Note tone="warn">
					ログインの状態を確かめられないため、買ったものを在庫に入れていません。画面を読み込み直すか、ログインし直してください
				</Note>
			) : null}

			{serverFailureCount > 0 ? (
				<Note tone="warn" action={retry}>
					{`${serverFailureCount}件の買ったものを、サーバーで在庫に入れられませんでした。時間をおいて、もう一度送ります`}
				</Note>
			) : null}

			{rejected.map((failure) => (
				<Note
					key={failure.entryId}
					tone="error"
					action={
						discardPurchase ? (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setDiscarding(failure)}
							>
								在庫に入れない
							</Button>
						) : undefined
					}
				>
					{`${failure.ingredientName}を在庫に入れられません：${failure.message}`}
				</Note>
			))}

			<ConfirmDialog
				open={discarding !== null}
				title={`${discarding?.ingredientName ?? ""}を在庫に入れずに消しますか`}
				cancelLabel="やめる"
				confirmLabel="消す"
				danger
				onCancel={() => setDiscarding(null)}
				onConfirm={() => void confirmDiscard()}
			>
				買い物メモの購入はそのままで、在庫には入りません。必要なら、在庫の画面から追加してください。
			</ConfirmDialog>
		</>
	);
}
