import { useId } from "react";
import { Toggle } from "#/components/toggle/toggle";
import { useScreenWakeLock } from "#/components/use-screen-wake-lock";
import { useStorageItem } from "#/local-storage/use-storage-item";
import { recipeKeepAwakeItem } from "../infrastructure/recipe-view-preferences";
import * as styles from "./recipe-keep-awake.css";

// レシピを見ているあいだ、画面を消灯させない。トグルで切れる（この端末に保存）。使えないブラウザでは、何も出さない。
// 作り方の見出しの右に置く（作り方がないレシピでは、出さない）。
export function RecipeKeepAwake() {
	const [isEnabled, setIsEnabled] = useStorageItem(recipeKeepAwakeItem);
	const { isSupported, isActive } = useScreenWakeLock(isEnabled);
	const id = useId();

	if (!isSupported) {
		return null;
	}

	return (
		<div className={styles.root}>
			<div className={styles.row}>
				<label className={styles.text} htmlFor={id} aria-hidden="true">
					画面をつけたまま
				</label>
				<Toggle
					id={id}
					label="画面をつけたまま"
					checked={isEnabled}
					onChange={setIsEnabled}
				/>
			</div>
			{isEnabled && !isActive ? (
				<span className={styles.hint}>今は使えません</span>
			) : null}
		</div>
	);
}
