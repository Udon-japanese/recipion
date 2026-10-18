import type { ReactNode } from "react";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import type { TagTone } from "./tag.css";
import * as styles from "./tag.css";

type TagProps = {
	tone?: TagTone;
	icon?: IconName;
	// 「約」（だいたい）の印として、輪郭を破線にする。
	approximate?: boolean;
	children: ReactNode;
};

// 状態・場所・期限などの札。枠がなく、押せない（押せるものは Chip）。
export function Tag({
	tone = "default",
	icon,
	approximate = false,
	children,
}: TagProps) {
	return (
		<span className={styles.tag({ tone, approximate })}>
			{icon ? (
				<span className={styles.icon({ tone })}>
					<Icon name={icon} size={16} />
				</span>
			) : null}
			{children}
		</span>
	);
}
