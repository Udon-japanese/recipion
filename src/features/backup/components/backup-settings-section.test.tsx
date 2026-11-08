import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "#/components/toast/toast-viewport";
import {
	buildBackupInventoryItem,
	buildBackupRecipe,
} from "#/test/builders/build-backup";
import type {
	BackupExportDependencies,
	BackupImportDependencies,
} from "../application/backup-transfer";
import { createBackupFile } from "../domain/backup-file";
import { BackupSettingsSection } from "./backup-settings-section";

// 画面の上のお知らせ（showToast）を、見えるようにする。
beforeEach(() => {
	render(<ToastViewport />);
});

const now = new Date("2026-11-01T03:00:00.000Z");

function createDependencies() {
	const exportDependencies: BackupExportDependencies = {
		loadRecipePage: vi.fn(async () => ({
			recipes: [buildBackupRecipe()],
			nextOffset: null,
		})),
		loadInventory: vi.fn(async () => [buildBackupInventoryItem()]),
		loadDictionary: vi.fn(async () => [
			{ name: "マイだし", aliases: ["うちのだし"], unmanaged: false },
		]),
	};
	const importDependencies = {
		inspect: vi.fn(async () => ({
			ownedPublicIds: ["owned"],
			recipeCount: 1,
		})),
		importRecipes: vi.fn<BackupImportDependencies["importRecipes"]>(
			async (recipes) =>
				recipes.map((recipe) => ({
					filePublicId: recipe.publicId,
					publicId: recipe.publicId,
					status: recipe.publicId === "owned" ? "skipped" : "created",
					attachLinks: recipe.publicId !== "owned",
				})),
		),
		importLinks: vi.fn(async () => ({ dropped: 0 })),
		replaceInventory: vi.fn(async () => ({ items: 1, lots: 1 })),
		countPendingPurchases: vi.fn(async () => 0),
		mergeDictionary: vi.fn(async () => ({
			created: 1,
			aliases: 1,
			skipped: 0,
		})),
	} satisfies BackupImportDependencies;

	return { exportDependencies, importDependencies };
}

function createFile(contents: string, name = "backup.json"): File {
	return new File([contents], name, { type: "application/json" });
}

const backupText = JSON.stringify(
	createBackupFile(
		[buildBackupRecipe(), buildBackupRecipe({ publicId: "owned" })],
		[buildBackupInventoryItem()],
		now,
	),
);

describe("BackupSettingsSection", () => {
	it("書き出すと、在庫とレシピを1つの JSON ファイルにして保存する", async () => {
		const user = userEvent.setup();
		const saveFile = vi.fn();
		const { exportDependencies, importDependencies } = createDependencies();

		render(
			<BackupSettingsSection
				exportDependencies={exportDependencies}
				importDependencies={importDependencies}
				saveFile={saveFile}
				now={() => now}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "ファイルに書き出す" }),
		);

		expect(saveFile).not.toHaveBeenCalled();

		await user.click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "書き出す",
			}),
		);

		await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
		const [fileName, contents] = saveFile.mock.calls[0] ?? [];

		expect(fileName).toBe("recipion-backup-2026-11-01.json");
		expect(
			await screen.findByText(/書き出しました（レシピ1件・在庫1品目）/u),
		).toBeInTheDocument();
		expect(JSON.parse(contents)).toMatchObject({
			format: "recipion-backup",
			version: 3,
			recipes: [{ publicId: "nikujaga" }],
			inventory: [{ name: "卵" }],
			dictionary: [{ name: "マイだし", aliases: ["うちのだし"] }],
		});
	});

	it("ファイルを選ぶと、何が入るかをシートで見せ、決めてから読み込む", async () => {
		const user = userEvent.setup();
		const { exportDependencies, importDependencies } = createDependencies();

		render(
			<BackupSettingsSection
				exportDependencies={exportDependencies}
				importDependencies={importDependencies}
			/>,
		);

		await user.upload(
			screen.getByLabelText("読み込むファイル"),
			createFile(backupText),
		);

		expect(
			await screen.findByText(/新しく1件（もうある1件は飛ばします）/u),
		).toBeInTheDocument();
		expect(screen.getByText(/在庫：1品目/u)).toBeInTheDocument();

		expect(importDependencies.importRecipes).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "置き換えて読み込む" }),
		);

		expect(
			await screen.findByText(
				/レシピを1件入れました（1件は、もうあったので飛ばしました）/u,
			),
		).toBeInTheDocument();
		expect(importDependencies.replaceInventory).toHaveBeenCalledTimes(1);
	});

	it("在庫を外すと、レシピだけを読み込む", async () => {
		const user = userEvent.setup();
		const { exportDependencies, importDependencies } = createDependencies();

		render(
			<BackupSettingsSection
				exportDependencies={exportDependencies}
				importDependencies={importDependencies}
			/>,
		);

		await user.upload(
			screen.getByLabelText("読み込むファイル"),
			createFile(backupText),
		);
		await user.click(
			await screen.findByRole("checkbox", { name: "在庫を置き換える" }),
		);
		await user.click(screen.getByRole("button", { name: "読み込む" }));

		expect(
			await screen.findByText(/レシピを1件入れました/u),
		).toBeInTheDocument();
		expect(importDependencies.replaceInventory).not.toHaveBeenCalled();
	});

	it("読めないファイルは、理由を出して、何も書き込まない", async () => {
		const user = userEvent.setup();
		const { exportDependencies, importDependencies } = createDependencies();

		render(
			<BackupSettingsSection
				exportDependencies={exportDependencies}
				importDependencies={importDependencies}
			/>,
		);

		await user.upload(
			screen.getByLabelText("読み込むファイル"),
			createFile(JSON.stringify({ format: "other" })),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"在庫とレシピのファイルではありません",
		);
		expect(importDependencies.inspect).not.toHaveBeenCalled();
	});
});
