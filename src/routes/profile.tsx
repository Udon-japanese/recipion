import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AvatarField } from "#/features/avatar/components/avatar-field";
import { updateAvatarServerFn } from "#/features/avatar/server/update-avatar";
import { ProfileForm } from "#/features/profile/components/profile-form";
import {
	ProfilePageLayout,
	ProfileSettingsLink,
} from "#/features/profile/components/profile-page-layout";
import { ProfileRouteError } from "#/features/profile/components/profile-route-error";
import { getProfileServerFn } from "#/features/profile/server/get-profile";
import { updateProfileServerFn } from "#/features/profile/server/update-profile";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export const Route = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: pageTitle("プロフィール") }] }),
	loader: () => getProfileServerFn(),
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
				onSave={(input) => updateProfileServerFn({ data: input })}
				onChanged={() => void refetch()}
				avatar={
					session ? (
						<AvatarField
							userId={session.user.id}
							avatar={session.user.avatar}
							onSave={async (avatar) => {
								try {
									await updateAvatarServerFn({ data: { avatar } });
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
