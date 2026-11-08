import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { useMediaQuery } from "#/components/use-media-query";
import { ExpiryEstimateSetting } from "#/features/inventory/components/expiry-estimate-setting";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import { InstallEntry } from "#/features/pwa/components/install-entry";
import { StandInModeSetting } from "#/features/recipes/components/stand-in-mode-setting";
import { standInModeItem } from "#/features/recipes/infrastructure/stand-in-mode-storage";
import { useStorageItem } from "#/local-storage/use-storage-item";
import * as styles from "./settings-page.css";

export const settingsTabs = [
	"inventory",
	"ingredients",
	"recipe",
	"data",
	"account",
] as const;

export type SettingsTab = (typeof settingsTabs)[number];

const tabLabels: Record<SettingsTab, string> = {
	inventory: "在庫",
	ingredients: "材料",
	recipe: "レシピ",
	data: "データ",
	account: "アカウント",
};

type SettingsPageProps = {
	tab: SettingsTab;
	onTabChange: (tab: SettingsTab) => void;
	// 材料の欄（自分の材料と呼び名）。
	ingredients: ReactNode;
	// レシピの欄（うちの人数。ログインしているときだけ渡す。なければ、タブも出さない）。
	recipe?: ReactNode;
	// データの欄（書き出し・読み込み）。
	data: ReactNode;
	// アカウントの欄（ログインしているときだけ渡す。なければ、タブも出さない）。
	account?: ReactNode;
};

// 設定の画面。カテゴリごとにタブで分ける（狭い画面は上に横並び、PC は左に縦並び）。
// 在庫の設定は、この端末だけに保存する（ログインしていなくても開ける）。
export function SettingsPage({
	tab,
	onTabChange,
	ingredients,
	recipe,
	data,
	account,
}: SettingsPageProps) {
	const tabs = settingsTabs.filter(
		(candidate) =>
			(candidate !== "account" || account !== undefined) &&
			(candidate !== "recipe" || recipe !== undefined),
	);
	const activeTab = tabs.includes(tab) ? tab : "inventory";
	const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());
	const isWide = useMediaQuery(styles.wide);

	// 矢印キーで隣のタブへ（横並びでも縦並びでも、どちらの矢印でも動く）。Home・End で端へ。
	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const index = tabs.indexOf(activeTab);
		const nextIndex =
			event.key === "ArrowRight" || event.key === "ArrowDown"
				? (index + 1) % tabs.length
				: event.key === "ArrowLeft" || event.key === "ArrowUp"
					? (index - 1 + tabs.length) % tabs.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? tabs.length - 1
							: null;

		if (nextIndex === null) {
			return;
		}

		event.preventDefault();

		const next = tabs[nextIndex];

		if (next !== undefined) {
			onTabChange(next);
			tabRefs.current.get(next)?.focus();
		}
	}

	return (
		<div className={styles.page}>
			<h1 className={styles.title}>設定</h1>
			<InstallEntry />

			<div className={styles.layout}>
				<div
					className={styles.tabList}
					role="tablist"
					aria-label="設定のカテゴリ"
					aria-orientation={isWide ? "vertical" : "horizontal"}
				>
					{tabs.map((candidate) => (
						<button
							className={styles.tab}
							type="button"
							role="tab"
							key={candidate}
							id={`settings-tab-${candidate}`}
							aria-selected={candidate === activeTab}
							aria-controls={`settings-panel-${candidate}`}
							tabIndex={candidate === activeTab ? 0 : -1}
							ref={(node) => {
								if (node) {
									tabRefs.current.set(candidate, node);
								} else {
									tabRefs.current.delete(candidate);
								}
							}}
							onClick={() => onTabChange(candidate)}
							onKeyDown={handleKeyDown}
						>
							{tabLabels[candidate]}
						</button>
					))}
				</div>

				<div
					className={styles.panel}
					role="tabpanel"
					id={`settings-panel-${activeTab}`}
					aria-labelledby={`settings-tab-${activeTab}`}
				>
					{activeTab === "inventory" ? <InventorySettings /> : null}
					{activeTab === "ingredients" ? ingredients : null}
					{activeTab === "recipe" ? recipe : null}
					{activeTab === "data" ? data : null}
					{activeTab === "account" ? account : null}
				</div>
			</div>
		</div>
	);
}

function InventorySettings() {
	const [expiryEstimateLevel, setExpiryEstimateLevel] =
		useExpiryEstimateLevel();
	const [standInMode, setStandInMode] = useStorageItem(standInModeItem);

	return (
		<section className={styles.section} aria-labelledby="settings-inventory">
			<div className={styles.sectionHead}>
				<h2 className={styles.sectionTitle} id="settings-inventory">
					在庫
				</h2>
			</div>
			<ExpiryEstimateSetting
				level={expiryEstimateLevel}
				onChange={setExpiryEstimateLevel}
			/>
			<StandInModeSetting mode={standInMode} onChange={setStandInMode} />
		</section>
	);
}
