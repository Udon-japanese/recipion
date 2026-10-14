import { createLink } from "@tanstack/react-router";
import { type ComponentProps, forwardRef, type ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "./button";
import * as styles from "./button.css";

type ButtonAnchorProps = Omit<ComponentProps<"a">, "className" | "style"> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	align?: "start" | "end";
	leadingIcon?: ReactNode;
};

const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonAnchorProps>(
	function ButtonAnchor(
		{
			variant = "primary",
			size = "md",
			fullWidth = false,
			align = "start",
			leadingIcon,
			children,
			...rest
		},
		ref,
	) {
		return (
			<span
				className={styles.wrapper}
				data-full-width={fullWidth || undefined}
				data-align={align}
			>
				<a
					{...rest}
					ref={ref}
					className={styles.button}
					data-variant={variant}
					data-size={size}
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
	},
);

// 画面の移動（リンク）を、ボタンと同じ見た目にする。押すと移動するもの（「レシピを作る」など）に使う。
// 移動先は、TanStack Router の Link と同じ指定（to・params）。操作（保存・送信）には、Button を使う。
export const ButtonLink = createLink(ButtonAnchor);
