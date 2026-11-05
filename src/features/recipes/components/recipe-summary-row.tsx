import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Icon } from "#/components/icon/icon";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Tag } from "#/components/tag/tag";
import { AvatarArt } from "#/features/avatar/components/avatar-art";
import type { Avatar } from "#/features/avatar/domain/avatar";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import * as styles from "./recipe-summary-row.css";
import { RecipeThumbnail } from "./recipe-thumbnail";

type RecipeSummaryRowProps = {
	// 開くレシピの公開 ID。null は、開けない（リンクにしない）。
	publicId: string | null;
	// 料理の絵がないときに、プリセットを選ぶ種（ふつうは公開 ID）。
	thumbnailSeed: string;
	cover: DishPlacement[] | null;
	name: string;
	// できあがりの量（「2人分」「12個」。空なら出さない）。
	yieldText: string | null;
	// 他の人のレシピの作者（自分のレシピでは、なし）。
	author?: { name: string; handle: string; avatar: Avatar } | null;
	// 人数のあとに並べる、ほかの印（公開範囲など）。
	extra?: ReactNode;
};

// レシピの一覧の1行（自分のレシピ・みんなのレシピ・つくった、で同じ見た目）。
export function RecipeSummaryRow({
	publicId,
	thumbnailSeed,
	cover,
	name,
	yieldText,
	author,
	extra,
}: RecipeSummaryRowProps) {
	return (
		<ListRow
			leading={<RecipeThumbnail cover={cover} publicId={thumbnailSeed} />}
			actions={publicId ? <Icon name="chevron-right" size={20} /> : undefined}
		>
			{publicId ? (
				<Link
					className={styles.link}
					to="/recipes/$publicId"
					params={{ publicId }}
				>
					<ListRowName>{name}</ListRowName>
				</Link>
			) : (
				<ListRowName>{name}</ListRowName>
			)}
			<ListRowMeta>
				{yieldText ? <Tag>{yieldText}</Tag> : null}
				{extra}
				{author ? (
					<span className={styles.author}>
						<AvatarArt avatar={author.avatar} size={20} />
						{author.name}（@{author.handle}）
					</span>
				) : null}
			</ListRowMeta>
		</ListRow>
	);
}
