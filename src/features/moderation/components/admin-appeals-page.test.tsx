import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OpenAppeal } from "../domain/appeal";
import { AdminAppealsPage } from "./admin-appeals-page";

const appeal: OpenAppeal = {
	id: "a1",
	userName: "れしぴょなー",
	userHandle: "user-1",
	userEmail: "a@example.com",
	message: "誤判定だと思います",
	verdict: "legitimate",
	createdAt: "2026-10-11T00:00:00Z",
	suspendedAt: "2026-10-10T00:00:00Z",
	suspensionReason: "繰り返したため",
};

describe("AdminAppealsPage", () => {
	it("申し立てと AI の見立てを表示し、永久停止は確認の2段階", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(<AdminAppealsPage appeals={[appeal]} onResolve={onResolve} />);

		expect(screen.getByText("誤判定だと思います")).toBeInTheDocument();
		expect(screen.getByText(/正当な申し立て/u)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "永久停止にする" }));

		expect(onResolve).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "本当に永久停止にする" }),
		);

		expect(onResolve).toHaveBeenCalledWith("a1", "ban");
		expect(
			await screen.findByText("未対応の申し立ては、ありません。"),
		).toBeInTheDocument();
	});

	it("停止の解除は、確認なしで送る", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn(async () => "done" as const);

		render(<AdminAppealsPage appeals={[appeal]} onResolve={onResolve} />);
		await user.click(screen.getByRole("button", { name: "停止を解除する" }));

		expect(onResolve).toHaveBeenCalledWith("a1", "lift");
	});

	it("対応済みの申し立ての履歴を、対応の内容つきで表示する", async () => {
		const user = userEvent.setup();

		render(
			<AdminAppealsPage
				appeals={[]}
				resolved={[
					{
						id: "r1",
						userName: "れしぴょなー",
						userHandle: "user-2",
						message: "反省しています",
						verdict: "unsure",
						resolution: "lifted",
						createdAt: "2026-10-09T00:00:00Z",
						resolvedAt: "2026-10-10T00:00:00Z",
					},
				]}
				onResolve={async () => "done"}
			/>,
		);

		await user.click(screen.getByText("対応済みの申し立て（1件）"));

		expect(screen.getByText("反省しています")).toBeInTheDocument();
		expect(screen.getByText(/停止を解除した/u)).toBeInTheDocument();
		expect(screen.getByText(/判断できない/u)).toBeInTheDocument();
	});
});
