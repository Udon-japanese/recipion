import { DishArt } from "#/features/dish-art/components/dish-art";
import { type Avatar, avatarBackgrounds } from "../domain/avatar";
import * as styles from "./avatar-art.css";

type AvatarArtProps = {
	avatar: Avatar;
	// 見た目の大きさ（px）。
	size?: number;
};

// アバターの絵（丸く切り抜く）。飾りなので、読み上げない（名前は、まわりの文字やリンクが持つ）。
export function AvatarArt({ avatar, size = 32 }: AvatarArtProps) {
	return (
		<span className={styles.frame} style={{ width: size, height: size }}>
			<DishArt
				placements={avatar.placements}
				size={size}
				background={avatarBackgrounds[avatar.background]}
			/>
		</span>
	);
}
