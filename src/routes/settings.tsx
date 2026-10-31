import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { SignOutButton } from "#/features/auth/components/sign-out-button";
import { AccountDeletionSection } from "#/features/profile/components/account-deletion-section";
import { AccountSettingsSection } from "#/features/settings/components/account-settings-section";
import { SettingsPage } from "#/features/settings/components/settings-page";
import { authClient } from "#/integrations/better-auth/auth-client";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export const Route = createFileRoute("/settings")({
	head: () => ({ meta: [{ title: pageTitle("設定") }] }),
	// 設定は、この端末の保存（localStorage）から読む。
	ssr: false,
	component: SettingsRoute,
});

function SettingsRoute() {
	const { data: session } = useAppSession();

	return (
		<SettingsPage
			account={
				session ? (
					<AccountSettingsSection
						email={session.user.email}
						signOut={<SignOutButton />}
						deletion={
							session.user.handle ? (
								<AccountDeletionSection
									handle={session.user.handle}
									onRequestDeletion={async () => {
										// 確認のメールを送る。メールのリンクを開くと、削除されて、/account-deleted に移る。
										const { error } = await authClient.deleteUser({
											callbackURL: "/account-deleted",
										});

										return error === null;
									}}
								/>
							) : null
						}
					/>
				) : null
			}
		/>
	);
}
