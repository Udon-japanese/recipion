import * as styles from "./icon.css";
import { type IconName, iconDefinitions } from "./icon-definitions";

type IconProps = {
	name: IconName;
	// 16 / 20 / 24（線の太さは、サイズによらず、2 のまま）。
	size?: 16 | 20 | 24;
	// 読み上げる名前。省略すると、飾りとして扱い、読み上げない。
	label?: string;
};

// アイコン（デザインの icons.zip）。色は、まわりの文字の色（currentColor）に従う。
export function Icon({ name, size = 24, label }: IconProps) {
	const definition = iconDefinitions[name];
	const isSolid = definition.style === "solid";
	const isFilled = definition.style === "filled";

	return (
		<svg
			className={styles.icon}
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill={isSolid || isFilled ? "currentColor" : "none"}
			stroke={isSolid ? "none" : "currentColor"}
			strokeWidth={isSolid ? undefined : 2}
			strokeLinecap="round"
			strokeLinejoin="round"
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			{definition.content}
		</svg>
	);
}
