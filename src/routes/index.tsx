import { createFileRoute } from "@tanstack/react-router";
import { ShoppingList } from "../features/shopping/components/shopping-list";

export const Route = createFileRoute("/")({
	component: ShoppingPage,
});

function ShoppingPage() {
	return <ShoppingList />;
}
