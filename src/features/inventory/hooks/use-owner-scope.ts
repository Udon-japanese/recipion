import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { authClient } from "#/integrations/better-auth/auth-client";

export function useOwnerScope(): InventoryPurchaseOwnerScope | null {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) return null;

	return session ? `user:${session.user.id}` : "guest";
}
