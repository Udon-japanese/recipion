import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export function useOwnerScope(): InventoryPurchaseOwnerScope | null {
	const { data: session, isPending } = useAppSession();

	if (isPending) return null;

	return session ? `user:${session.user.id}` : "guest";
}
