import { createFileRoute, notFound } from "@tanstack/react-router";
import { UiGallery } from "#/dev/ui-gallery";

// 開発中だけの、部品の確認用ページ（本番では、404。WAF の許可リストにも入れない）。
export const Route = createFileRoute("/dev/ui")({
	ssr: false,
	beforeLoad: () => {
		if (!import.meta.env.DEV) {
			throw notFound();
		}
	},
	component: UiGallery,
});
