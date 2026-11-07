import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { Note } from "#/components/note/note";
import { signedInOwnerStorage } from "#/features/shopping/infrastructure/signed-in-owner-storage";
import { authClient } from "#/integrations/better-auth/auth-client";
import { getAuthErrorMessage } from "#/integrations/better-auth/auth-error-message";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import {
	clearAccountLocalData,
	countUnsentAccountChanges,
	findUnsentAccountChanges,
	noUnsentAccountChanges,
	type UnsentAccountChanges,
} from "#/local-db/clear-account-local-data";

type UserScope = `user:${string}`;

type SignOutButtonProps = {
	fullWidth?: boolean;
	// ログアウトの前に、まだ送れていない買い物メモの変更と、在庫に入れる買い物を送っておく（サーバー関数を呼ぶので、ルートから渡す）。
	// 送り終えるのを待ってから、送れていない分を数える。
	syncBeforeSignOut?: (ownerScope: UserScope) => Promise<unknown>;
	findUnsent?: (ownerScope: UserScope) => Promise<UnsentAccountChanges>;
	clearLocalData?: (
		ownerScope: UserScope,
		discarded: UnsentAccountChanges,
	) => Promise<boolean>;
};

function describeUnsent({
	shoppingChangeIds,
	purchaseIds,
}: UnsentAccountChanges) {
	return [
		shoppingChangeIds.length > 0
			? `買い物メモ ${shoppingChangeIds.length}件`
			: null,
		purchaseIds.length > 0
			? `在庫に入れる買い物 ${purchaseIds.length}件`
			: null,
	]
		.filter((part) => part !== null)
		.join("、");
}

// ログアウト。終わったら、ホームに移る。
// この端末から、その人の買い物メモ・在庫の控え・食材辞書の控えを消す（共用の端末で、次の人に残さない。次にログインしたら、サーバーから受け取り直す）。
// まだ送れていない変更があれば、先に聞く。「消してログアウト」を選ぶまでは、消さない。ゲスト・ほかの人のデータには触らない。
export function SignOutButton({
	fullWidth = false,
	syncBeforeSignOut,
	findUnsent = findUnsentAccountChanges,
	clearLocalData = clearAccountLocalData,
}: SignOutButtonProps) {
	const { data, refetch } = useAppSession();
	const navigate = useNavigate();
	const action = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// まだ送れていない変更（確認を出している間）。
	const [unsent, setUnsent] = useState<UnsentAccountChanges | null>(null);
	const [isDiscarding, setIsDiscarding] = useState(false);
	// 確認を出した操作は、ボタンを完了の見た目にしない（閉じたあとも）。
	const [askedToConfirm, setAskedToConfirm] = useState(false);
	const ownerScope: UserScope | null = data ? `user:${data.user.id}` : null;

	// discarded：「消してログアウト」で捨てると決めた変更（確認の前は null）。
	async function signOut(discarded: UnsentAccountChanges | null) {
		setErrorMessage(null);

		if (!discarded) {
			setAskedToConfirm(false);
		}

		try {
			if (ownerScope && !discarded) {
				// 送れなくても、ログアウトは止めない（送れなかった分は、次の確認で数える）。
				await syncBeforeSignOut?.(ownerScope).catch(() => undefined);

				const found = await findUnsent(ownerScope);

				if (countUnsentAccountChanges(found) > 0) {
					setAskedToConfirm(true);
					setUnsent(found);

					return;
				}
			}

			const result = await authClient.signOut();

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));

				return false;
			}

			// ログアウトできてから消す（ログアウトに失敗したら、何も消さない）。
			// 確かめたあとに、送れていない変更が増えていたら、消さずに残す（次に、その人がログインしたら送る）。
			if (ownerScope) {
				await clearLocalData(
					ownerScope,
					discarded ?? noUnsentAccountChanges,
				).catch(() => false);
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

	async function discardAndSignOut(discarded: UnsentAccountChanges) {
		setIsDiscarding(true);

		try {
			await signOut(discarded);
		} finally {
			setIsDiscarding(false);
			setUnsent(null);
		}
	}

	return (
		<>
			<Button
				variant="secondary"
				fullWidth={fullWidth}
				status={askedToConfirm ? "idle" : action.status}
				pendingLabel="ログアウトしています"
				onClick={() => void action.run(() => signOut(null))}
			>
				ログアウト
			</Button>

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

			<ConfirmDialog
				open={unsent !== null}
				title="まだ送れていない変更があります"
				cancelLabel="ログアウトしない"
				confirmLabel="消してログアウト"
				danger
				pending={isDiscarding}
				onCancel={() => setUnsent(null)}
				onConfirm={() => {
					if (unsent) {
						void discardAndSignOut(unsent);
					}
				}}
			>
				{`まだほかの端末に送れていない変更があります（${unsent ? describeUnsent(unsent) : ""}）。この変更は、この端末にしかありません。ログアウトすると、この端末から消え、元に戻せません。通信できる場所で開き直すと、送れることがあります。`}
			</ConfirmDialog>
		</>
	);
}
