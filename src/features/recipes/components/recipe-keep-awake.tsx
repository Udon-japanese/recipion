import { useId } from "react";
import { Toggle } from "#/components/toggle/toggle";
import { useScreenWakeLock } from "#/components/use-screen-wake-lock";
import { useStorageItem } from "#/local-storage/use-storage-item";
import { recipeKeepAwakeItem } from "../infrastructure/recipe-view-preferences";
import * as styles from "./recipe-keep-awake.css";

// レシピを見ているあいだ、画面を消灯させない。トグルで切れる（この端末に保存）。使えないブラウザでは、何も出さない。
export function RecipeKeepAwake() {
	const [isEnabled, setIsEnabled] = useStorageItem(recipeKeepAwakeItem);
	const { isSupported, isActive } = useScreenWakeLock(isEnabled);
	const id = useId();

	if (!isSupported) {
		return null;
	}

	return (
		<div className={styles.row}>
			<label className={styles.text} htmlFor={id} aria-hidden="true">
				調理中は、画面を消さない
				{isEnabled && !isActive ? (
					<span className={styles.hint}>（今は、使えません）</span>
				) : null}
			</label>
			<Toggle
				id={id}
				label="調理中は、画面を消さない"
				checked={isEnabled}
				onChange={setIsEnabled}
			/>
		</div>
	);
}
