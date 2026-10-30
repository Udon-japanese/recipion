import { IconButton } from "#/components/icon-button/icon-button";
import * as styles from "./inventory-list.css";

export type InventoryView = "list" | "scene";

type ViewToggleProps = {
	value: InventoryView;
	onChange: (view: InventoryView) => void;
};

// 在庫の表示の切り替え（リスト／おうち）。
export function ViewToggle({ value, onChange }: ViewToggleProps) {
	return (
		<fieldset className={styles.viewToggle} aria-label="表示の切り替え">
			<IconButton
				icon="list"
				label="リストで見る"
				size="std"
				tone={value === "list" ? "on" : "plain"}
				aria-pressed={value === "list"}
				onClick={() => onChange("list")}
			/>
			<IconButton
				icon="zone-fridge"
				label="おうちで見る"
				size="std"
				tone={value === "scene" ? "on" : "plain"}
				aria-pressed={value === "scene"}
				onClick={() => onChange("scene")}
			/>
		</fieldset>
	);
}
