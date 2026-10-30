import { useState } from "react";
import { Button } from "#/components/button/button";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { inventoryZoneLabels } from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ListView } from "./list-view";
import { PanelView } from "./panel-view";
import {
	baseItems,
	describeAmount,
	manyItems,
	type SampleItem,
} from "./sample-data";
import { SceneView } from "./scene-view";

type View = "home" | "list" | "panel";

// 在庫画面のUI案（開発中だけ。/dev/inventory）。3つの見せ方を、同じ見本データで切り替えて触れる。
export function InventoryConcepts() {
	const [view, setView] = useState<View>("home");
	const [many, setMany] = useState(false);
	const [night, setNight] = useState(false);
	const [petVisible, setPetVisible] = useState(true);
	const [edited, setEdited] = useState<SampleItem[] | null>(null);
	const [selected, setSelected] = useState<SampleItem | null>(null);

	// 「たくさん」を切り替えたら、並べ替えの結果は捨てる。
	const items = edited ?? (many ? manyItems : baseItems);

	return (
		<main className={styles.page}>
			<div className={styles.devBar}>
				<strong>在庫画面 UI案（試作）</strong>
				<label className={styles.devCheck}>
					<input
						type="checkbox"
						checked={many}
						onChange={(event) => {
							setMany(event.target.checked);
							setEdited(null);
						}}
					/>
					食材をたくさん（{manyItems.length}件）
				</label>
				<label className={styles.devCheck}>
					<input
						type="checkbox"
						checked={petVisible}
						onChange={(event) => setPetVisible(event.target.checked)}
					/>
					れしぽよを出す
				</label>
				<label className={styles.devCheck}>
					<input
						type="checkbox"
						checked={night}
						onChange={(event) => setNight(event.target.checked)}
					/>
					夜（れしぽよが寝る）
				</label>
			</div>

			<SegmentedControl
				label="表示"
				value={view}
				onChange={setView}
				options={[
					{ value: "home", label: "おうち", icon: "inventory-box" },
					{ value: "list", label: "リスト", icon: "list" },
					{ value: "panel", label: "パネル", icon: "square-rounded" },
				]}
			/>

			{view === "home" ? (
				<SceneView
					items={items}
					night={night}
					petVisible={petVisible}
					selectedId={selected?.id ?? null}
					onSelect={setSelected}
				/>
			) : null}
			{view === "list" ? (
				<ListView
					items={items}
					selectedId={selected?.id ?? null}
					onSelect={setSelected}
				/>
			) : null}
			{view === "panel" ? (
				<PanelView
					items={items}
					onItemsChange={setEdited}
					selectedId={selected?.id ?? null}
					onSelect={setSelected}
				/>
			) : null}

			{selected ? (
				<div
					className={styles.detail}
					role="dialog"
					aria-label="食材の詳細（見本）"
				>
					<div style={{ flex: 1 }}>
						<strong>{selected.name}</strong>
						<div className={styles.itemAmount}>
							{inventoryZoneLabels[selected.zone]}・{describeAmount(selected)}
							（詳細パネルは、いまのものをそのまま使う）
						</div>
					</div>
					<Button variant="secondary" onClick={() => setSelected(null)}>
						閉じる
					</Button>
				</div>
			) : null}
		</main>
	);
}
