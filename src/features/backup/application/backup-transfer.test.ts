import { describe, expect, it } from "vitest";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import type { RecipeEditorDocument } from "#/features/recipes/domain/recipe-editor-document";
import {
	buildBackupInventoryItem,
	buildBackupRecipe,
} from "#/test/builders/build-backup";
import {
	type BackupFile,
	type BackupInventoryItem,
	parseBackupFile,
} from "../domain/backup-file";
import {
	decideRecipeImport,
	deriveImportPublicId,
	prepareRecipeImportDocument,
} from "../domain/plan-recipe-import";
import {
	type BackupExportDependencies,
	type BackupImportDependencies,
	collectBackup,
	type ImportedRecipe,
	previewBackupImport,
	runBackupImport,
} from "./backup-transfer";

type StoredRecipe = {
	ownerUserId: string;
	createdAt: string;
	content: RecipeEditorDocument;
};

// サーバーの代わり（レシピは公開 ID ごと、在庫は人ごと）。公開 ID の決め方・リンクの扱いは、本物と同じ関数を使う。
function createFakeServer() {
	const recipes = new Map<string, StoredRecipe>();
	const inventories = new Map<string, BackupInventoryItem[]>();
	let sequence = 0;
	let clock = 0;

	function forUser(userId: string, options: { failOnBatch?: number } = {}) {
		let batch = 0;

		const exportDependencies: BackupExportDependencies = {
			async loadRecipePage(offset) {
				const own = [...recipes]
					.filter(([, recipe]) => recipe.ownerUserId === userId)
					.sort(([, left], [, right]) =>
						left.createdAt.localeCompare(right.createdAt),
					);
				const page = own.slice(offset, offset + 2);

				return {
					recipes: page.map(([publicId, recipe]) => ({
						publicId,
						createdAt: recipe.createdAt,
						content: recipe.content,
					})),
					nextOffset: offset + 2 < own.length ? offset + 2 : null,
				};
			},
			loadInventory: async () => inventories.get(userId) ?? [],
		};
		const importDependencies: BackupImportDependencies = {
			async inspect(publicIds) {
				const owned: string[] = [];

				// サーバーと同じく、他の人と重なる ID は、代わりの ID を自分が持っていれば、持っているものとする。
				for (const publicId of publicIds) {
					const owner = recipes.get(publicId)?.ownerUserId;
					const checkedId =
						owner !== undefined && owner !== userId
							? await deriveImportPublicId(userId, publicId)
							: publicId;

					if (recipes.get(checkedId)?.ownerUserId === userId) {
						owned.push(publicId);
					}
				}

				return {
					ownedPublicIds: owned,
					recipeCount: [...recipes.values()].filter(
						(recipe) => recipe.ownerUserId === userId,
					).length,
				};
			},
			async importRecipes(batchRecipes) {
				batch += 1;

				if (batch === options.failOnBatch) {
					throw new Error("通信に失敗しました");
				}

				const ownerOf = (publicId: string) => {
					const stored = recipes.get(publicId);

					return stored === undefined
						? null
						: stored.ownerUserId === userId
							? "self"
							: "other";
				};
				const results: ImportedRecipe[] = [];

				for (const recipe of batchRecipes) {
					const owner = ownerOf(recipe.publicId);
					const derivedId =
						owner === "other"
							? await deriveImportPublicId(userId, recipe.publicId)
							: null;
					const decision = decideRecipeImport(
						recipe.publicId,
						owner,
						derivedId === null
							? null
							: { publicId: derivedId, owner: ownerOf(derivedId) },
					);

					if (decision.action === "skip") {
						results.push({
							filePublicId: recipe.publicId,
							publicId: decision.publicId,
							status: "skipped",
							attachLinks:
								(recipes.get(decision.publicId)?.content.links.length ?? 0) ===
								0,
						});
						continue;
					}

					sequence += 1;
					clock += 1;

					const publicId = decision.publicId ?? `generated-${sequence}`;
					const content = prepareRecipeImportDocument(recipe.content);

					// サーバーと同じく、保存の検証を通す。
					prepareRecipeForStorage(content);
					recipes.set(publicId, {
						ownerUserId: userId,
						createdAt: new Date(
							Date.UTC(2026, 10, 1, 0, 0, clock),
						).toISOString(),
						content,
					});
					results.push({
						filePublicId: recipe.publicId,
						publicId,
						status: "created",
						attachLinks: true,
					});
				}

				return results;
			},
			async importLinks(items) {
				let dropped = 0;

				for (const item of items) {
					const stored = recipes.get(item.publicId);

					if (!stored || stored.ownerUserId !== userId) {
						dropped += item.links.length;
						continue;
					}

					const kept = item.links.filter((link) => {
						const target = recipes.get(link.targetPublicId);

						return (
							target !== undefined &&
							link.targetPublicId !== item.publicId &&
							(target.ownerUserId === userId ||
								target.content.visibility === "public")
						);
					});

					dropped += item.links.length - kept.length;
					stored.content = { ...stored.content, links: kept };
				}

				return { dropped };
			},
			async replaceInventory(items) {
				inventories.set(userId, items);

				return {
					items: items.length,
					lots: items.reduce((total, item) => total + item.lots.length, 0),
				};
			},
			countPendingPurchases: async () => 0,
		};

		return { exportDependencies, importDependencies };
	}

	return { recipes, inventories, forUser };
}

const now = new Date("2026-11-01T00:00:00.000Z");

// 比べるときに、作り直す ID を除く。
function withoutIds(file: BackupFile) {
	return file.recipes.map((recipe) => ({
		publicId: recipe.publicId,
		name: recipe.content.name,
		ingredients: recipe.content.ingredients.map((node) => node.rawText),
		instructions: recipe.content.instructions.map((node) => node.text),
		links: recipe.content.links,
		visibility: recipe.content.visibility,
	}));
}

const dashi = buildBackupRecipe({
	publicId: "dashi",
	createdAt: "2026-09-01T00:00:00.000Z",
	content: { name: "だし" },
});
const misoSoup = buildBackupRecipe({
	publicId: "miso-soup",
	createdAt: "2026-09-02T00:00:00.000Z",
	content: {
		name: "みそ汁",
		note: "[[だし]]を使う",
		links: [{ label: "だし", targetPublicId: "dashi" }],
	},
});
const nikujaga = buildBackupRecipe({
	publicId: "nikujaga",
	createdAt: "2026-09-03T00:00:00.000Z",
	content: { visibility: "public" },
});

function createFile(): BackupFile {
	return parseBackupFile(
		JSON.stringify({
			format: "recipion-backup",
			version: 2,
			exportedAt: now.toISOString(),
			recipes: [nikujaga, misoSoup, dashi],
			inventory: [
				buildBackupInventoryItem(),
				buildBackupInventoryItem({
					name: "みそ汁",
					stockUnitLabel: "回分",
					sourceRecipePublicId: "miso-soup",
				}),
			],
		}),
	);
}

describe("書き出し・読み込み", () => {
	it("空のアカウントに読み込んで、書き出し直すと、同じ内容になる（公開範囲は非公開から）", async () => {
		const server = createFakeServer();
		const user = server.forUser("new-user");
		const file = createFile();

		const result = await runBackupImport(
			file,
			{ recipes: true, inventory: true },
			user.importDependencies,
		);
		const exported = parseBackupFile(
			JSON.stringify(await collectBackup(user.exportDependencies, now)),
		);

		expect(result).toEqual({
			createdRecipes: 3,
			skippedRecipes: 0,
			droppedLinks: 0,
			inventory: { items: 2, lots: 2 },
		});
		expect(withoutIds(exported)).toEqual(
			withoutIds({
				...file,
				recipes: [dashi, misoSoup, nikujaga].map((recipe) => ({
					...recipe,
					content: { ...recipe.content, visibility: "private" },
				})),
			}),
		);
		expect(exported.inventory).toEqual(file.inventory);
	});

	it("同じファイルを二度読み込んでも、レシピは増えず、在庫は同じ内容のまま", async () => {
		const server = createFakeServer();
		const user = server.forUser("new-user");
		const file = createFile();

		await runBackupImport(
			file,
			{ recipes: true, inventory: true },
			user.importDependencies,
		);
		const second = await runBackupImport(
			file,
			{ recipes: true, inventory: true },
			user.importDependencies,
		);

		expect(second).toMatchObject({ createdRecipes: 0, skippedRecipes: 3 });
		expect(server.recipes.size).toBe(3);
		expect(server.inventories.get("new-user")).toEqual(file.inventory);
		expect(
			await previewBackupImport(file, user.importDependencies),
		).toMatchObject({ newRecipeCount: 0, skippedRecipeCount: 3 });
	});

	it("公開 ID が他の人に使われていれば新しい ID で作り、リンクと作り置きを付け替える", async () => {
		const server = createFakeServer();
		const file = createFile();

		// 書き出した人（まだ退会していない）の別のアカウントに入れる。
		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			server.forUser("original").importDependencies,
		);
		const other = server.forUser("other");

		await runBackupImport(
			file,
			{ recipes: true, inventory: true },
			other.importDependencies,
		);

		const own = [...server.recipes].filter(
			([, recipe]) => recipe.ownerUserId === "other",
		);
		const ownMisoSoup = own.find(
			([, recipe]) => recipe.content.name === "みそ汁",
		);
		const ownDashi = own.find(([, recipe]) => recipe.content.name === "だし");

		expect(own).toHaveLength(3);
		expect(ownMisoSoup?.[1].content.links).toEqual([
			{ label: "だし", targetPublicId: ownDashi?.[0] },
		]);
		expect(server.inventories.get("other")?.[1]?.sourceRecipePublicId).toBe(
			ownMisoSoup?.[0],
		);
	});

	it("リンクを付ける前に止まっても、読み込み直すと、前に作ったレシピにもリンクが付く", async () => {
		const server = createFakeServer();
		// 1回目は、レシピを作ったあと、リンクを付ける段で止まる。
		const file = createFile();

		await expect(
			runBackupImport(
				file,
				{ recipes: true, inventory: false },
				{
					...server.forUser("user").importDependencies,
					importLinks: async () => {
						throw new Error("通信に失敗しました");
					},
				},
			),
		).rejects.toThrow("通信に失敗しました");
		expect(server.recipes.get("miso-soup")?.content.links).toEqual([]);

		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			server.forUser("user").importDependencies,
		);

		expect(server.recipes.get("miso-soup")?.content.links).toEqual([
			{ label: "だし", targetPublicId: "dashi" },
		]);
	});

	it("読み込んだあとに直したリンクは、読み込み直しても、ファイルの内容に戻さない", async () => {
		const server = createFakeServer();
		const file = createFile();
		const user = server.forUser("user");

		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			user.importDependencies,
		);

		const misoSoup = server.recipes.get("miso-soup");

		if (!misoSoup) {
			throw new Error("みそ汁が入っていません");
		}

		const edited = [{ label: "だし", targetPublicId: "nikujaga" }];

		misoSoup.content = { ...misoSoup.content, links: edited };

		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			user.importDependencies,
		);

		expect(server.recipes.get("miso-soup")?.content.links).toEqual(edited);
	});

	it("他の人と公開 ID が重なるファイルは、何度読み込んでも、増えない", async () => {
		const server = createFakeServer();
		const file = createFile();

		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			server.forUser("original").importDependencies,
		);

		const other = server.forUser("other");

		await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			other.importDependencies,
		);
		const second = await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			other.importDependencies,
		);

		expect(second).toMatchObject({ createdRecipes: 0, skippedRecipes: 3 });
		expect(
			[...server.recipes.values()].filter(
				(recipe) => recipe.ownerUserId === "other",
			),
		).toHaveLength(3);
		await expect(
			previewBackupImport(file, other.importDependencies),
		).resolves.toMatchObject({ newRecipeCount: 0, skippedRecipeCount: 3 });
	});

	it("途中で失敗しても、同じファイルで読み込み直すと、続きから入る", async () => {
		const server = createFakeServer();
		const recipes = Array.from({ length: 12 }, (_, index) =>
			buildBackupRecipe({
				publicId: `recipe-${index}`,
				createdAt: new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
				content: { name: `レシピ${index}` },
			}),
		);
		const file = parseBackupFile(
			JSON.stringify({
				format: "recipion-backup",
				version: 2,
				exportedAt: now.toISOString(),
				recipes,
				inventory: [],
			}),
		);

		await expect(
			runBackupImport(
				file,
				{ recipes: true, inventory: false },
				server.forUser("user", { failOnBatch: 2 }).importDependencies,
			),
		).rejects.toThrow("通信に失敗しました");
		expect(server.recipes.size).toBe(10);

		const retried = await runBackupImport(
			file,
			{ recipes: true, inventory: false },
			server.forUser("user").importDependencies,
		);

		expect(retried).toMatchObject({ createdRecipes: 2, skippedRecipes: 10 });
		expect(server.recipes.size).toBe(12);
	});

	it("レシピの上限を超えるとき・未送信の購入があるときは、読み込む前に理由を伝える", async () => {
		const server = createFakeServer();
		const user = server.forUser("user");
		const file = createFile();

		const preview = await previewBackupImport(file, {
			inspect: async () => ({ ownedPublicIds: [], recipeCount: 299 }),
			countPendingPurchases: async () => 1,
		});

		expect(preview.recipeProblem).toBe(
			"レシピは1人300件までです。あと1件しか入れられません（新しいレシピは3件）。",
		);
		expect(preview.inventoryProblem).toContain("まだ在庫へ送れていない購入");
		expect(
			await previewBackupImport(file, user.importDependencies),
		).toMatchObject({ recipeProblem: null, inventoryProblem: null });
	});
});
