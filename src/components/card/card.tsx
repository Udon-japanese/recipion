import type { ComponentProps } from "react";
import * as styles from "./card.css";

type CardProps = Omit<ComponentProps<"div">, "className" | "style"> & {
	// 内側の余白（既定は、なし。行を並べるときは、行が余白を持つ）。
	padding?: "none" | "md";
};

// 白い面（角丸 20px・影は軽く）。
export function Card({ padding = "none", ...rest }: CardProps) {
	return <div {...rest} className={styles.card} data-padding={padding} />;
}
