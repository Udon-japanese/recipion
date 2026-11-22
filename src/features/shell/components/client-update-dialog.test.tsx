import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	dismissClientUpdateRequired,
	isClientUpdateRequired,
	reportClientUpdateRequired,
} from "#/api/client-update-required";
import { ClientUpdateDialog } from "./client-update-dialog";

afterEach(() => {
	cleanup();
	act(() => dismissClientUpdateRequired());
});

describe("ClientUpdateDialog", () => {
	it("知らせがなければ出さず、知らせを受けたら出す。「更新する」で読み込み直す", async () => {
		const reload = vi.fn();

		render(<ClientUpdateDialog reload={reload} />);

		expect(screen.queryByRole("alertdialog")).toBeNull();

		act(() => reportClientUpdateRequired());
		await userEvent.click(screen.getByRole("button", { name: "更新する" }));

		expect(reload).toHaveBeenCalledOnce();
	});

	it("「あとで」で閉じる（次の知らせで、また出せる）", async () => {
		render(<ClientUpdateDialog reload={vi.fn()} />);

		act(() => reportClientUpdateRequired());
		await userEvent.click(screen.getByRole("button", { name: "あとで" }));

		expect(isClientUpdateRequired()).toBe(false);
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});
});
