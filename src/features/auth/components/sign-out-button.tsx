import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import {
	clearAccountShoppingMemo,
	countUnsentShoppingChanges,
} from "#/features/shopping/infrastructure/dexie-shopping-sign-out";
import { signedInOwnerStorage } from "#/features/shopping/infrastructure/signed-in-owner-storage";
import { authClient } from "#/integrations/better-auth/auth-client";
import { getAuthErrorMessage } from "#/integrations/better-auth/auth-error-message";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

type UserScope = `user:${string}`;

type SignOutButtonProps = {
	fullWidth?: boolean;
	// ログアウトの前に、まだ送れていない買い物メモの変更を送っておく（サーバー関数を呼ぶので、ルートから渡す）。
	syncBeforeSignOut?: (ownerScope: UserScope) => Promise<unknown>;
	countUnsent?: (ownerScope: UserScope) => Promise<number>;
	clearLocalMemo?: (
		ownerScope: UserScope,
		options: { discardUnsent: boolean },
	) => Promise<boolean>;
};

// ログアウト。終わったら、ホームに移る。
// この端末から、その人の買い物メモを消す（共用の端末で、次の人に残さない。次にログインしたら、サーバーから受け取り直す）。
// まだ送れていない変更があれば、先に聞く。「消してログアウト」を選ぶまでは、消さない。ゲスト・ほかの人のメモには触らない。
export function SignOutButton({
	fullWidth = false,
	syncBeforeSignOut,
	countUnsent = countUnsentShoppingChanges,
	clearLocalMemo = clearAccountShoppingMemo,
}: SignOutButtonProps) {
	const { data, refetch } = useAppSession();
	const navigate = useNavigate();
	const action = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// まだ送れていない変更の数（確認を出している間）。
	const [unsentCount, setUnsentCount] = useState<number | null>(null);
	const [isDiscarding, setIsDiscarding] = useState(false);
	// 確認を出した操作は、ボタンを完了の見た目にしない（閉じたあとも）。
	const [askedToConfirm, setAskedToConfirm] = useState(false);
	const ownerScope: UserScope | null = data ? `user:${data.user.id}` : null;

	async function signOut(discardUnsent: boolean) {
		setErrorMessage(null);

		if (!discardUnsent) {
			setAskedToConfirm(false);
		}

		try {
			if (ownerScope && !discardUnsent) {
				// 送れなくても、ログアウトは止めない（送れなかった分は、次の確認で数える）。
				await syncBeforeSignOut?.(ownerScope).catch(() => undefined);

				const count = await countUnsent(ownerScope);

				if (count > 0) {
					setAskedToConfirm(true);
					setUnsentCount(count);

					return;
				}
			}

			const result = await authClient.signOut();

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));

				return false;
			}

			// ログアウトできてから消す（ログアウトに失敗したら、何も消さない）。
			if (ownerScope) {
				await clearLocalMemo(ownerScope, { discardUnsent }).catch(() => false);
			}

			// この端末の「いまログインしている人」の記憶を消す（次の人に、買い物メモを見せない）。
			signedInOwnerStorage.remove();
			await refetch();
			await navigate({ to: "/" });

			return true;
		} catch {
			setErrorMessage(getAuthErrorMessage(null));

			return false;
		}
	}

	async function discardAndSignOut() {
		setIsDiscarding(true);

		try {
			await signOut(true);
		} finally {
			setIsDiscarding(false);
			setUnsentCount(null);
		}
	}

	return (
		<>
			<Button
				variant="secondary"
				fullWidth={fullWidth}
				status={askedToConfirm ? "idle" : action.status}
				pendingLabel="ログアウトしています"
				onClick={() => void action.run(() => signOut(false))}
			>
				ログアウト
			</Button>

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

			<ConfirmDialog
				open={unsentCount !== null}
				title="まだ送れていない変更があります"
				cancelLabel="ログアウトしない"
				confirmLabel="消してログアウト"
				danger
				pending={isDiscarding}
				onCancel={() => setUnsentCount(null)}
				onConfirm={() => void discardAndSignOut()}
			>
				{`買い物メモに、まだほかの端末に送れていない変更が${unsentCount ?? 0}件あります。この変更は、この端末にしかありません。ログアウトすると、この端末から消え、元に戻せません。通信できる場所で開き直すと、送れることがあります。`}
			</ConfirmDialog>
		</>
	);
}
