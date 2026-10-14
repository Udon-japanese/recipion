import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Note } from "#/components/note/note";
import { authClient } from "#/integrations/better-auth/auth-client";
import { getAuthErrorMessage } from "#/integrations/better-auth/auth-error-message";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

// ログアウト。終わったら、ホームに移る。
export function SignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
	const { refetch } = useAppSession();
	const navigate = useNavigate();
	const action = useButtonAction();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function signOut() {
		setErrorMessage(null);

		try {
			const result = await authClient.signOut();

			if (result.error) {
				setErrorMessage(getAuthErrorMessage(result.error));

				return false;
			}

			await refetch();
			await navigate({ to: "/" });

			return true;
		} catch {
			setErrorMessage(getAuthErrorMessage(null));

			return false;
		}
	}

	return (
		<>
			<Button
				variant="secondary"
				fullWidth={fullWidth}
				status={action.status}
				pendingLabel="ログアウトしています"
				onClick={() => void action.run(signOut)}
			>
				ログアウト
			</Button>

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
		</>
	);
}
