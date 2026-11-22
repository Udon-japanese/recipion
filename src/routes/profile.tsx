import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AvatarField } from "#/features/avatar/components/avatar-field";
import { ProfileForm } from "#/features/profile/components/profile-form";
import {
	ProfilePageLayout,
	ProfileSettingsLink,
} from "#/features/profile/components/profile-page-layout";
import { ProfileRouteError } from "#/features/profile/components/profile-route-error";
import * as meApi from "#/features/profile/infrastructure/me-api";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export const Route = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: pageTitle("プロフィール") }] }),
	loader: () => meApi.getProfile(),
	errorComponent: ProfileRouteError,
	component: ProfilePage,
});

function ProfilePage() {
	const profile = Route.useLoaderData();
	const { data: session, refetch } = useAppSession();

	return (
		<ProfilePageLayout>
			<ProfileForm
				profile={profile}
				onSave={(input) => meApi.updateProfile(input)}
				onChanged={() => void refetch()}
				avatar={
					session ? (
						<AvatarField
							userId={session.user.id}
							avatar={session.user.avatar}
							onSave={async (avatar) => {
								try {
									await meApi.updateAvatar(avatar);
									// ヘッダーなどの表示を、新しいアバターにする。
									await refetch();

									return true;
								} catch {
									return false;
								}
							}}
						/>
					) : null
				}
			/>
			<ProfileSettingsLink />
		</ProfilePageLayout>
	);
}
