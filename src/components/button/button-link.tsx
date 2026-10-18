import { createLink } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "./button.css";
import * as styles from "./button.css";

type ButtonAnchorProps = Omit<ComponentProps<"a">, "className" | "style"> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	align?: "start" | "end";
	leadingIcon?: ReactNode;
};

function ButtonAnchor({
	variant = "primary",
	size = "md",
	fullWidth = false,
	align = "start",
	leadingIcon,
	children,
	...rest
}: ButtonAnchorProps) {
	return (
		<span className={styles.wrapper({ fullWidth, align })}>
			<a
				{...rest}
				className={styles.button({ variant, size, fullWidth })}
				data-phase="idle"
				data-tone="success"
			>
				<span className={styles.label}>
					{leadingIcon ? (
						<span className={styles.leadingIcon} aria-hidden="true">
							{leadingIcon}
						</span>
					) : null}
					{children}
				</span>
			</a>
		</span>
	);
}

// 画面の移動（リンク）を、ボタンと同じ見た目にする。押すと移動するもの（「レシピを作る」など）に使う。
// 移動先は、TanStack Router の Link と同じ指定（to・params）。操作（保存・送信）には、Button を使う。
export const ButtonLink = createLink(ButtonAnchor);
