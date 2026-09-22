import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "#/features/auth/components/auth-panel";
import { ShoppingList } from "#/features/shopping/components/shopping-list";

export const Route = createFileRoute("/")({
	component: ShoppingPage,
});

function ShoppingPage() {
	return (
		<>
			<AuthPanel />
			<ShoppingList />
		</>
	);
}
