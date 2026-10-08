import { Fragment } from "react";
import {
	type AppleKeyStyle,
	formatShortcutKey,
	getShortcutSeparator,
	type ShortcutKey,
	type ShortcutPlatform,
} from "../domain/format-shortcut";
import { useShortcutPlatform } from "../hooks/use-shortcut-platform";
import * as styles from "./shortcut-keys.css";

type ShortcutKeysProps = {
	keys: readonly ShortcutKey[];
	// 指定がなければ、ブラウザの OS で決める（テストで指定する）。
	platform?: ShortcutPlatform;
	// Apple 系の表記（既定は、キー名）。
	appleStyle?: AppleKeyStyle;
};

// ショートカットを、キーごとに <kbd> で表示する。OS で表記が変わる（Mac は Option・Command、ほかは Alt・Ctrl）。
export function ShortcutKeys({
	keys,
	platform,
	appleStyle = "name",
}: ShortcutKeysProps) {
	const detectedPlatform = useShortcutPlatform();
	const options = { platform: platform ?? detectedPlatform, appleStyle };
	const separator = getShortcutSeparator(options);

	return (
		<span className={styles.group}>
			{keys.map((key, index) => (
				<Fragment key={key}>
					{index > 0 && separator !== "" ? (
						<span className={styles.separator} aria-hidden="true">
							{separator}
						</span>
					) : null}
					<kbd className={styles.key}>{formatShortcutKey(key, options)}</kbd>
				</Fragment>
			))}
		</span>
	);
}
