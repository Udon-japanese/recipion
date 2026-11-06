import { useState } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { Menu } from "#/components/menu/menu";
import { RecipeDeleteButton } from "./recipe-delete-button";
import * as styles from "./recipe-owner-actions.css";

type RecipeOwnerActionsProps = {
	publicId: string;
	onDelete: () => Promise<void>;
	// 「このレシピをもとに作る」（新規登録のエディタを、このレシピの中身で開く）。
	onFork?: () => void;
};

// 自分のレシピの、編集と「その他」（削除。確認のダイアログが出る）。
export function RecipeOwnerActions({
	publicId,
	onDelete,
	onFork,
}: RecipeOwnerActionsProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	return (
		<div className={styles.bar}>
			<ButtonLink
				to="/recipes/$publicId/edit"
				params={{ publicId }}
				variant="secondary"
				size="sm"
			>
				編集
			</ButtonLink>
			<Menu
				label="その他"
				icon="more-horizontal"
				items={[
					...(onFork
						? [
								{
									label: "このレシピをもとに作る",
									icon: "plus-stack" as const,
									onSelect: onFork,
								},
							]
						: []),
					{
						label: "削除",
						icon: "trash",
						tone: "danger",
						onSelect: () => setIsDeleting(true),
					},
				]}
			/>
			<RecipeDeleteButton
				open={isDeleting}
				onClose={() => setIsDeleting(false)}
				onDelete={onDelete}
			/>
		</div>
	);
}
