import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { Mascot } from "#/components/mascot/mascot";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import { LoginForm } from "./login-form";
import * as styles from "./login-page.css";

// ログインの画面（メール → 6桁のコード）。ログインできたら、redirectTo（なければホーム）に移る。
// ログイン済みの人が開いたときも、同じく移る。
// redirectTo は、確かめ済みの、アプリの中のパス（toSafeRedirectPath）。
export function LoginPage({ redirectTo }: { redirectTo?: string }) {
	const { data: session, refetch } = useAppSession();
	const navigate = useNavigate();
	const router = useRouter();

	useEffect(() => {
		if (!session) {
			return;
		}

		if (redirectTo === undefined) {
			void navigate({ to: "/", replace: true });
		} else {
			// 戻り先は、文字列のパス（型のあるルートではない）なので、履歴に直接入れる（ルーターは履歴の変化で移る）。
			router.history.replace(redirectTo);
		}
	}, [session, navigate, router, redirectTo]);

	function goBack() {
		if (router.history.canGoBack()) {
			router.history.back();
		} else {
			void navigate({ to: "/" });
		}
	}

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<IconButton
					icon="chevron-left"
					label="戻る"
					size="std"
					tone="plain"
					onClick={goBack}
				/>
				<h1 className={styles.title}>ログイン</h1>
			</header>

			<main className={styles.main}>
				<div className={styles.heading}>
					<Mascot size={34} />
					<h1 className={styles.headingTitle}>ログイン</h1>
				</div>

				<div className={styles.panel}>
					<LoginForm refetchSession={refetch} />
				</div>
			</main>
		</div>
	);
}
