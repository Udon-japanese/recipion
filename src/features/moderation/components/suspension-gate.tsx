import { useEffect, useState } from "react";
import { SignOutButton } from "#/features/auth/components/sign-out-button";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import { getAccountStatusServerFn } from "../server/account-status";
import { submitAppealServerFn } from "../server/submit-appeal";
import { SuspendedScreen } from "./suspended-screen";

// ログイン中のアカウントが停止されていれば、アプリの代わりに、停止の画面を出す。
// 停止の確認は、サーバー関数でも行っている（この画面は、案内のため）。確認できないとき（オフラインなど）は、通常どおり表示する。
export function SuspensionGate({ children }: { children: React.ReactNode }) {
	const { data: session } = useAppSession();
	const userId = session?.user.id ?? null;
	const [status, setStatus] = useState<{
		userId: string;
		value: "suspended" | "banned";
	} | null>(null);

	useEffect(() => {
		if (userId === null) {
			setStatus(null);

			return;
		}

		let cancelled = false;

		getAccountStatusServerFn()
			.then((value) => {
				if (!cancelled) {
					setStatus(value ? { userId, value } : null);
				}
			})
			.catch(() => {
				// 確認できなければ、通常どおり表示する。
			});

		return () => {
			cancelled = true;
		};
	}, [userId]);

	if (status && status.userId === userId) {
		return (
			<>
				<SuspendedScreen
					status={status.value}
					onSubmitAppeal={(message) =>
						submitAppealServerFn({ data: { message } })
					}
				/>
				<SignOutButton />
			</>
		);
	}

	return children;
}
