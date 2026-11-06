import { useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Checkbox } from "#/components/checkbox/checkbox";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Note } from "#/components/note/note";
import { describeError } from "#/errors/user-facing-error";
import * as settingsStyles from "#/features/settings/components/settings-page.css";
import {
	type BackupExportDependencies,
	type BackupImportDependencies,
	type BackupImportPreview,
	type BackupImportProgress,
	type BackupImportResult,
	collectBackup,
	previewBackupImport,
	runBackupImport,
} from "../application/backup-transfer";
import {
	backupLimits,
	formatBackupFileName,
	parseBackupFile,
} from "../domain/backup-file";
import * as styles from "./backup-settings-section.css";

type BackupSettingsSectionProps = {
	exportDependencies: BackupExportDependencies;
	importDependencies: BackupImportDependencies;
	// 書き出したファイルを、端末に保存する（テストでは差し替える）。
	saveFile?: (fileName: string, contents: string) => void;
	now?: () => Date;
};

function saveFileWithDownload(fileName: string, contents: string): void {
	const url = URL.createObjectURL(
		new Blob([contents], { type: "application/json" }),
	);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	// クリックの処理が終わってから、URL を捨てる。
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatCount(count: number): string {
	return count.toLocaleString("ja-JP");
}

function describeResult(result: BackupImportResult): string {
	const parts: string[] = [];

	if (result.createdRecipes > 0 || result.skippedRecipes > 0) {
		parts.push(
			result.skippedRecipes > 0
				? `レシピを${formatCount(result.createdRecipes)}件入れました（${formatCount(result.skippedRecipes)}件は、もうあったので飛ばしました）。`
				: `レシピを${formatCount(result.createdRecipes)}件入れました。`,
		);
	}

	if (result.createdRecipes > 0) {
		parts.push("入れたレシピは、非公開です。");
	}

	if (result.droppedLinks > 0) {
		parts.push(
			`リンク${formatCount(result.droppedLinks)}件は、相手のレシピが見つからないため、付けませんでした。`,
		);
	}

	if (result.inventory) {
		parts.push(
			`在庫を、ファイルの内容（${formatCount(result.inventory.items)}品目）に置き換えました。`,
		);
	}

	if (result.dictionary) {
		const { created, aliases, skipped } = result.dictionary;

		parts.push(
			`材料を${formatCount(created)}件、呼び名を${formatCount(aliases)}件足しました${skipped > 0 ? `（${formatCount(skipped)}件は、ほかの材料と重なるなどのため、入れませんでした）` : ""}。`,
		);
	}

	return parts.length === 0 ? "入れるものはありませんでした。" : parts.join("");
}

// 設定の「データ」：在庫とレシピを、ファイルに書き出す・ファイルから読み込む。
export function BackupSettingsSection({
	exportDependencies,
	importDependencies,
	saveFile = saveFileWithDownload,
	now = () => new Date(),
}: BackupSettingsSectionProps) {
	const [isExportOpen, setIsExportOpen] = useState(false);
	// 書き出しの状態。書き出せたら閉じるので、見せるのは処理中と失敗だけ（失敗すると、開いたまま残る）。
	const exportAction = useButtonAction();
	const isExporting = exportAction.isPending;
	const [exportError, setExportError] = useState<string | null>(null);
	const [exported, setExported] = useState<{
		recipes: number;
		inventory: number;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	// ファイルを読む状態。読めたら確認のシートが開くので、見せるのは処理中と失敗だけ。
	const readAction = useButtonAction();
	const [importError, setImportError] = useState<string | null>(null);
	const [preview, setPreview] = useState<BackupImportPreview | null>(null);
	const [includeRecipes, setIncludeRecipes] = useState(true);
	const [includeInventory, setIncludeInventory] = useState(true);
	const [includeDictionary, setIncludeDictionary] = useState(true);
	const [progress, setProgress] = useState<BackupImportProgress | null>(null);
	const [result, setResult] = useState<BackupImportResult | null>(null);

	async function exportBackup() {
		setExportError(null);

		await exportAction.run(async () => {
			try {
				const file = await collectBackup(exportDependencies, now());

				saveFile(formatBackupFileName(now()), JSON.stringify(file, null, "\t"));
				setExported({
					recipes: file.recipes.length,
					inventory: file.inventory.length,
				});
				setIsExportOpen(false);
			} catch (error) {
				setExportError(describeError(error));

				return false;
			}
		});
	}

	async function readFile(file: File) {
		setImportError(null);
		setResult(null);
		setPreview(null);

		if (file.size > backupLimits.maxFileBytes) {
			setImportError("ファイルが大きすぎます（20MB まで）");
			return;
		}

		await readAction.run(async () => {
			try {
				const nextPreview = await previewBackupImport(
					parseBackupFile(await file.text()),
					importDependencies,
				);

				setPreview(nextPreview);
				setIncludeRecipes(
					nextPreview.newRecipeCount > 0 && nextPreview.recipeProblem === null,
				);
				setIncludeInventory(
					nextPreview.inventoryItemCount > 0 &&
						nextPreview.inventoryProblem === null,
				);
				setIncludeDictionary(nextPreview.dictionaryCount > 0);
			} catch (error) {
				setImportError(describeError(error));

				return false;
			}
		});
	}

	async function startImport() {
		if (!preview) {
			return;
		}

		setImportError(null);
		setProgress({ done: 0, total: 0 });

		try {
			setResult(
				await runBackupImport(
					preview.file,
					{
						recipes: includeRecipes,
						inventory: includeInventory,
						dictionary: includeDictionary,
					},
					importDependencies,
					setProgress,
				),
			);
		} catch (error) {
			setImportError(
				`${describeError(error)}（入った分は残っています。同じファイルを読み込み直すと、続きから入れられます）`,
			);
		} finally {
			setProgress(null);
			setPreview(null);
		}
	}

	const isImporting = progress !== null;
	const canImport = includeRecipes || includeInventory || includeDictionary;

	return (
		<section className={settingsStyles.section} aria-labelledby="settings-data">
			<div className={settingsStyles.sectionHead}>
				<h2 className={settingsStyles.sectionTitle} id="settings-data">
					在庫とレシピ
				</h2>
			</div>
			<p className={styles.text}>
				在庫とレシピを、この端末のファイルに書き出せます。書き出したファイルを読み込むと、その内容に戻せます（機種を変えたとき、アカウントを作り直したときなど）。
			</p>

			<div className={styles.block}>
				<h3 className={styles.blockTitle}>書き出す</h3>
				<Button
					variant="secondary"
					onClick={() => {
						setExportError(null);
						setExported(null);
						setIsExportOpen(true);
					}}
				>
					ファイルに書き出す
				</Button>
				{exported ? (
					<Note tone="success">
						書き出しました（レシピ{formatCount(exported.recipes)}件・在庫
						{formatCount(exported.inventory)}品目）。
					</Note>
				) : null}
			</div>

			<div className={styles.block}>
				<h3 className={styles.blockTitle}>読み込む</h3>
				<p className={styles.text}>
					もうあるレシピは、飛ばします。在庫は、ファイルの内容に置き換わります。
				</p>
				<input
					ref={fileInputRef}
					className={styles.fileInput}
					type="file"
					accept="application/json,.json"
					aria-label="読み込むファイル"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];

						// 同じファイルを、続けて選び直せるように、空にしておく。
						event.currentTarget.value = "";

						if (file) {
							void readFile(file);
						}
					}}
				/>
				<Button
					variant="secondary"
					status={readAction.status}
					pendingLabel="ファイルを読んでいます"
					errorLabel="読めませんでした"
					disabled={isImporting}
					onClick={() => fileInputRef.current?.click()}
				>
					ファイルを選ぶ
				</Button>
				{result ? <Note tone="success">{describeResult(result)}</Note> : null}
				{importError ? <Note tone="error">{importError}</Note> : null}
			</div>

			<CornerSheet
				open={isExportOpen}
				role="alertdialog"
				title="在庫とレシピを書き出しますか"
				onDismiss={isExporting ? undefined : () => setIsExportOpen(false)}
				left={{
					label: "やめる",
					icon: "close",
					disabled: isExporting,
					onClick: () => setIsExportOpen(false),
				}}
				right={{
					label: "書き出す",
					icon: "arrow-down",
					status: exportAction.status,
					errorLabel: "書き出せませんでした",
					onClick: () => void exportBackup(),
				}}
			>
				<div className={styles.sheetBody}>
					<p className={styles.sheetText}>
						すべてのレシピ（非公開のものも）と、今の在庫を、1つのファイルにして、この端末に保存します。
					</p>
					<p className={styles.sheetText}>
						ファイルは、ほかの人に渡さないよう、大切に保管してください。
					</p>
					{exportError ? <Note tone="error">{exportError}</Note> : null}
				</div>
			</CornerSheet>

			<CornerSheet
				open={preview !== null}
				role="alertdialog"
				title="このファイルを読み込みますか"
				onDismiss={isImporting ? undefined : () => setPreview(null)}
				left={{
					label: "やめる",
					icon: "close",
					disabled: isImporting,
					onClick: () => setPreview(null),
				}}
				right={{
					label: includeInventory ? "置き換えて読み込む" : "読み込む",
					icon: "check",
					danger: includeInventory,
					disabled: !canImport,
					// 失敗しても閉じる（文は、シートの外に出す）ので、見せるのは処理中だけ。
					status: isImporting ? "pending" : "idle",
					onClick: () => void startImport(),
				}}
			>
				{preview ? (
					<div className={styles.sheetBody}>
						<p className={styles.sheetText}>
							{formatBackupDate(preview.file.exportedAt)} に書き出したファイル
						</p>
						<div className={styles.option}>
							<Checkbox
								label="レシピを入れる"
								checked={includeRecipes}
								disabled={
									preview.newRecipeCount === 0 ||
									preview.recipeProblem !== null ||
									isImporting
								}
								onChange={(event) =>
									setIncludeRecipes(event.currentTarget.checked)
								}
							/>
							<span className={styles.optionText}>
								レシピ：新しく{formatCount(preview.newRecipeCount)}件
								{preview.skippedRecipeCount > 0
									? `（もうある${formatCount(preview.skippedRecipeCount)}件は飛ばします）`
									: ""}
								。非公開で入ります。
							</span>
						</div>
						{preview.recipeProblem ? (
							<Note tone="warn">{preview.recipeProblem}</Note>
						) : null}
						<div className={styles.option}>
							<Checkbox
								label="在庫を置き換える"
								checked={includeInventory}
								disabled={
									preview.inventoryItemCount === 0 ||
									preview.inventoryProblem !== null ||
									isImporting
								}
								onChange={(event) =>
									setIncludeInventory(event.currentTarget.checked)
								}
							/>
							<span className={styles.optionText}>
								在庫：{formatCount(preview.inventoryItemCount)}品目
								{preview.inventoryItemCount > 0
									? "。今の在庫（入れた分・期限・履歴）は消えて、この内容になります。取り消せません。"
									: ""}
							</span>
						</div>
						{preview.inventoryProblem ? (
							<Note tone="warn">{preview.inventoryProblem}</Note>
						) : null}
						<div className={styles.option}>
							<Checkbox
								label="材料を足す"
								checked={includeDictionary}
								disabled={preview.dictionaryCount === 0 || isImporting}
								onChange={(event) =>
									setIncludeDictionary(event.currentTarget.checked)
								}
							/>
							<span className={styles.optionText}>
								材料：{formatCount(preview.dictionaryCount)}件
								{preview.dictionaryCount > 0
									? "。今の材料に足します（消したり、置き換えたりはしません）。"
									: ""}
							</span>
						</div>
						{progress && progress.total > 0 ? (
							<Note tone="info" spinning>
								読み込んでいます（{progress.done}/{progress.total}）
							</Note>
						) : null}
					</div>
				) : null}
			</CornerSheet>
		</section>
	);
}

function formatBackupDate(value: string): string {
	return new Intl.DateTimeFormat("ja-JP", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
