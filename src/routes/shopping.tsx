import { createFileRoute } from "@tanstack/react-router";
import { ShoppingList } from "../features/shopping/components/shopping-list";

export const Route = createFileRoute("/shopping")({
  ssr: false,
	component: ShoppingPage,
});

function ShoppingPage() {
	return <ShoppingList />;
}
