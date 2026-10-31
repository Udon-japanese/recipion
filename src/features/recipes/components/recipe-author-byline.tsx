import { AvatarArt } from "#/features/avatar/components/avatar-art";
import type { Avatar } from "#/features/avatar/domain/avatar";
import * as styles from "./recipe-author-byline.css";

type RecipeAuthorBylineProps = {
	name: string;
	handle: string;
	// なければ、名前とハンドルだけ（プレビューなど）。
	avatar?: Avatar;
};

// 他の人のレシピの、作者の1行（アバター・表示名・ハンドル）。
export function RecipeAuthorByline({
	name,
	handle,
	avatar,
}: RecipeAuthorBylineProps) {
	return (
		<span className={styles.byline}>
			{avatar ? <AvatarArt avatar={avatar} size={24} /> : null}
			<span className={styles.name}>
				<span className={styles.visuallyHidden}>作者：</span>
				{name}
			</span>
			<span>@{handle}</span>
		</span>
	);
}
