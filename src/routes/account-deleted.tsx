import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearLocalData } from "#/local-db/clear-local-data";

export const Route = createFileRoute("/account-deleted")({
	component: AccountDeletedPage,
});

// アカウントを削除したあとに開く画面。この端末に残っているデータも、消す。
function AccountDeletedPage() {
	useEffect(() => {
		void clearLocalData();
	}, []);

	return (
		<section>
			<h1>アカウントを削除しました</h1>
			<p>
				アカウントと、保存した情報を削除しました。ご利用ありがとうございました。
			</p>
			{/* 端末のデータを消したあとなので、ページを読み込み直して、最初の状態から始める。 */}
			<a href="/">トップへ</a>
		</section>
	);
}
