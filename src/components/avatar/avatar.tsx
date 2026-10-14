import * as styles from "./avatar.css";

type AvatarProps = {
	// 表示名。先頭の1文字を出す。
	name: string;
};

// 表示名の頭文字の丸（飾り。押せるボタンの中に置く）。
export function Avatar({ name }: AvatarProps) {
	const initial = [...name.trim()][0] ?? "れ";

	return (
		<span className={styles.avatar} aria-hidden="true">
			{initial}
		</span>
	);
}
