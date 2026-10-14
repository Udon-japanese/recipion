import { createFileRoute, notFound } from "@tanstack/react-router";
import { InventoryPreview } from "#/dev/inventory-preview";

// 開発中だけの、在庫の画面の確認用ページ（本番では、404。WAF の許可リストにも入れない）。
export const Route = createFileRoute("/dev/inventory")({
	ssr: false,
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: InventoryPreview,
});
