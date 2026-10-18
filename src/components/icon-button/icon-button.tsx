import type { ComponentProps } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import type { IconButtonSize, IconButtonTone } from "./icon-button.css";
import * as styles from "./icon-button.css";

type IconButtonProps = Omit<
	ComponentProps<"button">,
	"children" | "className" | "style" | "aria-label"
> & {
	icon: IconName;
	// 読み上げる名前（必須。アイコンだけのボタンのため）。
	label: string;
	// std：見た目も 44px。sm（既定）：見た目は 36px で、押せる範囲は 44px。
	size?: IconButtonSize;
	// muted（既定）：薄い灰色の丸／plain：背景なし／danger：赤い文字／on：選択中（黄色の丸＋濃い枠）。
	tone?: IconButtonTone;
	iconSize?: 16 | 20 | 24;
	// 並べ替えのつかみ部分（タッチで動かしたとき、スクロールではなくドラッグになるよう、スクロールを止める）。
	dragHandle?: boolean;
};

// アイコンだけのボタン（閉じる・戻る・編集・並べ替え・その他 など）。
export function IconButton({
	icon,
	label,
	size = "sm",
	tone = "muted",
	iconSize,
	dragHandle = false,
	type = "button",
	...rest
}: IconButtonProps) {
	return (
		<button
			{...rest}
			className={styles.button({ size, tone, dragHandle })}
			type={type}
			aria-label={label}
		>
			<Icon name={icon} size={iconSize ?? (size === "std" ? 24 : 20)} />
		</button>
	);
}
