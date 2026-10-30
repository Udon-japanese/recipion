import { useState } from "react";
import { Button } from "#/components/button/button";
import { IconButton } from "#/components/icon-button/icon-button";
import { inventoryZoneLabels } from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ListView } from "./list-view";
import {
	baseItems,
	describeAmount,
	manyItems,
	type SampleItem,
} from "./sample-data";
import { SceneView } from "./scene-view";

type View = "home" | "list";

function ViewToggle({
	view,
	onChange,
}: {
	view: View;
	onChange: (view: View) => void;
}) {
	return (
		<fieldset className={styles.viewToggle} aria-label="表示の切り替え">
			<IconButton
				icon="zone-fridge"
				label="おうちで見る"
				size="std"
				tone={view === "home" ? "on" : "plain"}
				aria-pressed={view === "home"}
				onClick={() => onChange("home")}
			/>
			<IconButton
				icon="list"
				label="リストで見る"
				size="std"
				tone={view === "list" ? "on" : "plain"}
				aria-pressed={view === "list"}
				onClick={() => onChange("list")}
			/>
		</fieldset>
	);
}

// 在庫画面のUI案（開発中だけ。/dev/inventory）。「おうち」と「リスト」を、同じ見本データで切り替えて触れる。
export function InventoryConcepts() {
	const [view, setView] = useState<View>("home");
	const [many, setMany] = useState(false);
	const [night, setNight] = useState(false);
	const [petVisible, setPetVisible] = useState(true);
	const [selected, setSelected] = useState<SampleItem | null>(null);

	const items = many ? manyItems : baseItems;
	const toggle = <ViewToggle view={view} onChange={setView} />;

	return (
		<main className={styles.page}>
			<div className={styles.devBar}>
				<strong>在庫画面 UI案（試作）</strong>
				<label className={styles.devCheck}>
					<input
						type="checkbox"
						checked={many}
						onChange={(event) => setMany(event.target.checked)}
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
					夜
				</label>
			</div>

			{view === "home" ? (
				<SceneView
					items={items}
					night={night}
					petVisible={petVisible}
					selectedId={selected?.id ?? null}
					onSelect={setSelected}
					toggle={toggle}
				/>
			) : (
				<ListView
					items={items}
					selectedId={selected?.id ?? null}
					onSelect={setSelected}
					toggle={toggle}
				/>
			)}

			{selected ? (
				<div
					className={styles.detail}
					role="dialog"
					aria-label="食材の詳細（見本）"
				>
					<div style={{ flex: 1 }}>
						<strong>{selected.name}</strong>
						<div className={styles.caption}>
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
