import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "#/components/toast/toast-viewport";
import { buildShoppingData } from "#/test/builders/build-shopping-backup";
import { createShoppingBackupFile } from "../domain/shopping-backup-file";
import { ShoppingBackupSection } from "./shopping-backup-section";

// 画面の上のお知らせ（showToast）を、見えるようにする。
beforeEach(() => {
	render(<ToastViewport />);
});

const now = new Date("2026-11-01T03:00:00.000Z");

function createFile(contents: string): File {
	return new File([contents], "shopping.json", { type: "application/json" });
}

function renderSection() {
	const props = {
		loadData: vi.fn(async () => buildShoppingData()),
		replaceData: vi.fn(async () => {}),
		saveFile: vi.fn(),
		now: () => now,
	};

	render(<ShoppingBackupSection {...props} />);

	return props;
}

describe("ShoppingBackupSection", () => {
	it("確かめてから書き出し、購入済みの項目はファイルに入れない", async () => {
		const user = userEvent.setup();
		const { saveFile } = renderSection();

		await user.click(
			screen.getByRole("button", { name: "買い物メモを書き出す" }),
		);

		expect(saveFile).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "書き出す" }));

		expect(saveFile).toHaveBeenCalledTimes(1);
		const [fileName, contents] = saveFile.mock.calls[0] ?? [];

		expect(fileName).toBe("recipion-shopping-2026-11-01.json");
		expect(
			JSON.parse(contents).items.map((item: { id: string }) => item.id),
		).toEqual(["item-egg", "item-mince"]);
		expect(
			await screen.findByText(
				"書き出しました（項目2件・店1件・条件つきメモ1件）",
			),
		).toBeInTheDocument();
	});

	it("ファイルを選ぶと、件数と置き換えの注意を見せ、決めてから置き換える", async () => {
		const user = userEvent.setup();
		const { replaceData } = renderSection();
		const file = createShoppingBackupFile(buildShoppingData(), now);

		await user.upload(
			screen.getByLabelText("読み込む買い物メモのファイル"),
			createFile(JSON.stringify(file)),
		);

		expect(
			await screen.findByText(
				/いまの買い物メモ（購入済みの項目も含めて）は消えて/u,
			),
		).toBeInTheDocument();
		expect(replaceData).not.toHaveBeenCalled();
		// シートの裏の「ファイルを選ぶ」は、完了の見た目にならない。
		expect(
			screen
				.getByRole("button", {
					name: "買い物メモのファイルを選ぶ",
					hidden: true,
				})
				.getAttribute("data-phase"),
		).toBe("idle");

		await user.click(
			screen.getByRole("button", { name: "置き換えて読み込む" }),
		);

		expect(replaceData).toHaveBeenCalledWith(file);
		expect(
			await screen.findByText(
				"買い物メモを、ファイルの内容（項目2件・店1件・条件つきメモ1件）に置き換えました",
			),
		).toBeInTheDocument();
	});

	it("読めないファイルは、理由を出し、置き換えない", async () => {
		const user = userEvent.setup();
		const { replaceData } = renderSection();

		await user.upload(
			screen.getByLabelText("読み込む買い物メモのファイル"),
			createFile(JSON.stringify({ format: "recipion-backup" })),
		);

		expect(
			await screen.findByText("買い物メモのファイルではありません"),
		).toBeInTheDocument();
		expect(replaceData).not.toHaveBeenCalled();
	});
});
