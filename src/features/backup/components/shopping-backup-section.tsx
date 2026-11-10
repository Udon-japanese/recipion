import { useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Note } from "#/components/note/note";
import { showToast } from "#/components/toast/toast-store";
import { describeError } from "#/errors/user-facing-error";
import * as settingsStyles from "#/features/settings/components/settings-page.css";
import {
	createShoppingBackupFile,
	formatShoppingBackupFileName,
	parseShoppingBackupFile,
	type ShoppingBackupData,
	type ShoppingBackupFile,
	shoppingBackupLimits,
} from "../domain/shopping-backup-file";
import {
	formatBackupDate,
	formatCount,
	saveFileWithDownload,
} from "./backup-file-helpers";
import * as styles from "./backup-settings-section.css";

type ShoppingBackupSectionProps = {
	// この端末の買い物メモを読む・ファイルの内容に置き換える（テストでは差し替える）。
	loadData: () => Promise<Parameters<typeof createShoppingBackupFile>[0]>;
	replaceData: (data: ShoppingBackupData) => Promise<void>;
	saveFile?: (fileName: string, contents: string) => void;
	now?: () => Date;
};

function describeContents(data: ShoppingBackupData): string {
	return `項目${formatCount(data.items.length)}件・店${formatCount(data.stores.length)}件・条件つきメモ${formatCount(data.branches.length)}件`;
}

// 設定の「データ」：買い物メモ（この端末のもの）を、ファイルに書き出す・ファイルの内容に置き換える。ログインしなくても使える。
export function ShoppingBackupSection({
	loadData,
	replaceData,
	saveFile = saveFileWithDownload,
	now = () => new Date(),
}: ShoppingBackupSectionProps) {
	const [isExportOpen, setIsExportOpen] = useState(false);
	const exportAction = useButtonAction();
	const [exportError, setExportError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const readAction = useButtonAction();
	const importAction = useButtonAction();
	const [importError, setImportError] = useState<string | null>(null);
	const [preview, setPreview] = useState<ShoppingBackupFile | null>(null);

	async function exportShopping() {
		setExportError(null);

		await exportAction.run(async () => {
			try {
				const file = createShoppingBackupFile(await loadData(), now());

				saveFile(
					formatShoppingBackupFileName(now()),
					JSON.stringify(file, null, "\t"),
				);
				showToast({
					id: "shopping-backup",
					message: `書き出しました（${describeContents(file)}）`,
					icon: "check",
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
		setPreview(null);

		if (file.size > shoppingBackupLimits.maxFileBytes) {
			setImportError("ファイルが大きすぎます（5MB まで）");
			return;
		}

		await readAction.run(async () => {
			try {
				setPreview(parseShoppingBackupFile(await file.text()));
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

		await importAction.run(async () => {
			try {
				await replaceData(preview);
				showToast({
					id: "shopping-backup",
					message: `買い物メモを、ファイルの内容（${describeContents(preview)}）に置き換えました`,
					icon: "check",
				});
			} catch (error) {
				// 1つのトランザクションなので、失敗したときは、いまのメモのまま。
				setImportError(
					`${describeError(error)}（いまの買い物メモは、そのままです）`,
				);
			} finally {
				setPreview(null);
			}
		});
	}

	const isImporting = importAction.isPending;

	return (
		<section
			className={settingsStyles.section}
			aria-labelledby="settings-shopping-data"
		>
			<div className={settingsStyles.sectionHead}>
				<h2 className={settingsStyles.sectionTitle} id="settings-shopping-data">
					買い物メモ
				</h2>
			</div>
			<p className={styles.text}>
				この端末の買い物メモ（まだ買っていない項目・店・条件つきメモ・いつも買う店・在庫への換算）を、ファイルに書き出せます。別の端末で読み込むと、その内容に置き換わります。ログインしていなくても使えます。
			</p>

			<div className={styles.block}>
				<h3 className={styles.blockTitle}>書き出す</h3>
				<Button
					variant="secondary"
					onClick={() => {
						setExportError(null);
						setIsExportOpen(true);
					}}
				>
					買い物メモを書き出す
				</Button>
			</div>

			<div className={styles.block}>
				<h3 className={styles.blockTitle}>読み込む</h3>
				<p className={styles.text}>
					いまの買い物メモは、ファイルの内容に置き換わります。
				</p>
				<input
					ref={fileInputRef}
					className={styles.fileInput}
					type="file"
					accept="application/json,.json"
					aria-label="読み込む買い物メモのファイル"
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
					// 読めたら確認のシートが開くので、完了の見た目は出さない（シートの裏で変わって見えるため）。
					status={readAction.status === "success" ? "idle" : readAction.status}
					pendingLabel="ファイルを読んでいます"
					errorLabel="読めませんでした"
					disabled={isImporting}
					onClick={() => fileInputRef.current?.click()}
				>
					買い物メモのファイルを選ぶ
				</Button>
				{importError ? <Note tone="error">{importError}</Note> : null}
			</div>

			<CornerSheet
				open={isExportOpen}
				role="alertdialog"
				title="買い物メモを書き出しますか"
				onDismiss={
					exportAction.isPending ? undefined : () => setIsExportOpen(false)
				}
				left={{
					label: "やめる",
					icon: "close",
					disabled: exportAction.isPending,
					onClick: () => setIsExportOpen(false),
				}}
				right={{
					label: "書き出す",
					icon: "arrow-down",
					status: exportAction.status,
					errorLabel: "書き出せませんでした",
					onClick: () => void exportShopping(),
				}}
			>
				<div className={styles.sheetBody}>
					<p className={styles.sheetText}>
						まだ買っていない項目と、店・条件つきメモ・いつも買う店・在庫への換算を、1つのファイルにして、この端末に保存します。購入済みの項目は入れません。
					</p>
					{exportError ? <Note tone="error">{exportError}</Note> : null}
				</div>
			</CornerSheet>

			<CornerSheet
				open={preview !== null}
				role="alertdialog"
				title="買い物メモを置き換えますか"
				onDismiss={isImporting ? undefined : () => setPreview(null)}
				left={{
					label: "やめる",
					icon: "close",
					disabled: isImporting,
					onClick: () => setPreview(null),
				}}
				right={{
					label: "置き換えて読み込む",
					icon: "check",
					danger: true,
					status: isImporting ? "pending" : "idle",
					onClick: () => void startImport(),
				}}
			>
				{preview ? (
					<div className={styles.sheetBody}>
						<p className={styles.sheetText}>
							{formatBackupDate(preview.exportedAt)} に書き出したファイル
						</p>
						<p className={styles.sheetText}>
							{describeContents(preview)}
							、いつも買う店{formatCount(preview.storeDefaults.length)}
							件、在庫への換算
							{formatCount(preview.conversionMemories.length)}
							件、いつもの買い方{formatCount(preview.itemMemories.length)}件
						</p>
						<Note tone="warn">
							いまの買い物メモ（購入済みの項目も含めて）は消えて、この内容になります。取り消せません。
						</Note>
					</div>
				) : null}
			</CornerSheet>
		</section>
	);
}
