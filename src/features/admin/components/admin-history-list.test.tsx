import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminHistoryList } from "./admin-history-list";

describe("AdminHistoryList", () => {
	it("件数を見出しに出し、項目ごとに、補足と対応の内容と日時を表示する", () => {
		render(
			<AdminHistoryList
				heading="対応済みの通報"
				items={[
					{
						id: "a",
						title: "つくね",
						meta: ["れしぴょなー", "その他"],
						resolutionLabel: "削除した",
						resolvedAt: "2026-10-09T03:00:00.000Z",
						detail: "詳しい説明",
					},
				]}
			/>,
		);

		expect(screen.getByText("対応済みの通報（1件）")).toBeInTheDocument();
		expect(screen.getByText("つくね")).toBeInTheDocument();
		expect(
			screen.getByText(/れしぴょなー・その他・削除した（.*2026.*12.*）/u),
		).toBeInTheDocument();
		expect(screen.getByText("詳しい説明")).toBeInTheDocument();
	});

	it("履歴がないときは、その旨を表示する", () => {
		render(<AdminHistoryList heading="対応済みの通報" items={[]} />);

		expect(screen.getByText("対応済みの通報（0件）")).toBeInTheDocument();
		expect(
			screen.getByText("対応済みのものは、まだありません。"),
		).toBeInTheDocument();
	});
});
