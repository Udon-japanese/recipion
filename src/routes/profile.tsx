import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm } from "#/features/profile/components/profile-form";
import { ProfileRouteError } from "#/features/profile/components/profile-route-error";
import { getProfileServerFn } from "#/features/profile/server/get-profile";
import { updateProfileServerFn } from "#/features/profile/server/update-profile";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export const Route = createFileRoute("/profile")({
	loader: () => getProfileServerFn(),
	errorComponent: ProfileRouteError,
	component: ProfilePage,
});

function ProfilePage() {
	const profile = Route.useLoaderData();
	const { refetch } = useAppSession();

	return (
		<ProfileForm
			profile={profile}
			onSave={(input) => updateProfileServerFn({ data: input })}
			onChanged={() => void refetch()}
		/>
	);
}
