import { createFileRoute, notFound } from "@tanstack/react-router";
import { InventoryConcepts } from "#/dev/inventory-concepts/concepts";

// 開発中だけの、在庫画面のUI案（本番では、404。WAF の許可リストにも入れない）。
export const Route = createFileRoute("/dev/inventory")({
	ssr: false,
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: InventoryConcepts,
});
