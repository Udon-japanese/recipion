import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminHome } from "./admin-home";

// リンクは、ルーターの外では、描画できないため、差し替える。
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

describe("AdminHome", () => {
	it("未対応の件数と、各画面へのリンクを表示する", () => {
		render(<AdminHome openReports={3} openAppeals={1} openUserReports={2} />);

		expect(screen.getByRole("link", { name: "通報" })).toHaveAttribute(
			"href",
			"/admin/reports",
		);
		expect(
			screen.getByRole("link", { name: "停止への申し立て" }),
		).toHaveAttribute("href", "/admin/appeals");
		expect(screen.getByText("未対応：3件")).toBeInTheDocument();
		expect(screen.getByText("未対応：1件")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "ユーザー名の通報" }),
		).toHaveAttribute("href", "/admin/user-reports");
		expect(screen.getByText("未対応：2件")).toBeInTheDocument();
	});
});
