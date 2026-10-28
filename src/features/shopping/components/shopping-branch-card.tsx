import { useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { Menu } from "#/components/menu/menu";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import * as styles from "./shopping-branch-card.css";

export type BranchCardSide = "then" | "else";

export type BranchCardSideView = {
	// 呼び名（ハンバーグ など）。なければ、「そうなら」「そうでなければ」。
	label: string | null;
	items: readonly {
		id: string;
		name: string;
		amount: string;
		// 買う店（決まっていれば）。
		storeName?: string;
	}[];
};

export type BranchCardView = {
	// 見出しの文（例：イオンに合い挽き肉 1パックが売っていたら）。
	condition: string;
	// 「そうなら」「そうでなければ」の側（then を、キー名にすると、Promise と見なされることがある）。
	ifTrue: BranchCardSideView;
	ifFalse: BranchCardSideView;
};

type ShoppingBranchCardProps = {
	branch: BranchCardView;
	onDecide: (side: BranchCardSide) => void;
	onEdit: () => void;
	onRemove: () => void;
	onRemoveItem: (side: BranchCardSide, itemId: string) => void;
	onAdd: (side: BranchCardSide) => void;
	onBulkAdd: (side: BranchCardSide) => void;
	// ログイン中だけ渡される。
	onAddFromRecipe?: (side: BranchCardSide) => void;
};

function sideName(view: BranchCardSideView, side: BranchCardSide): string {
	return view.label ?? (side === "then" ? "そうなら" : "そうでなければ");
}

function pickSide(branch: BranchCardView, side: BranchCardSide) {
	return side === "then" ? branch.ifTrue : branch.ifFalse;
}

// 条件つきのメモ：ふだんは1枚にたたむ（条件・2つの側の件数・「そうだった／ちがった」）。
// 「中身を見る」で、タブで1側ずつ、材料を見て直せる。編集と削除は、「その他」メニューの中。
export function ShoppingBranchCard({
	branch,
	onDecide,
	onEdit,
	onRemove,
	onRemoveItem,
	onAdd,
	onBulkAdd,
	onAddFromRecipe,
}: ShoppingBranchCardProps) {
	const detailId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [side, setSide] = useState<BranchCardSide>("then");
	const view = pickSide(branch, side);

	return (
		<section className={styles.card} aria-label={branch.condition}>
			<div className={styles.head}>
				<div className={styles.headText}>
					<p className={styles.eyebrow}>
						<Icon name="swap" size={16} />
						条件つき
					</p>
					<h2 className={styles.condition}>{branch.condition}</h2>
				</div>
				<Menu
					label={`${branch.condition}のその他`}
					icon="more-horizontal"
					items={[
						{ label: "条件を直す", icon: "edit", onSelect: onEdit },
						{
							label: "削除する",
							icon: "trash",
							tone: "danger",
							onSelect: onRemove,
						},
					]}
				/>
			</div>

			<div className={styles.summary}>
				<Tag icon="check-circle">
					{`${sideName(branch.ifTrue, "then")} ${branch.ifTrue.items.length}件`}
				</Tag>
				<Tag icon="ban-circle">
					{`${sideName(branch.ifFalse, "else")} ${branch.ifFalse.items.length}件`}
				</Tag>
			</div>

			<div className={styles.decide}>
				<Button
					size="lg"
					fullWidth
					leadingIcon={<Icon name="check" size={20} />}
					onClick={() => onDecide("then")}
				>
					そうだった
				</Button>
				<Button
					variant="secondary"
					size="lg"
					fullWidth
					leadingIcon={<Icon name="close" size={20} />}
					onClick={() => onDecide("else")}
				>
					ちがった
				</Button>
			</div>

			<button
				type="button"
				className={styles.toggleButton}
				aria-expanded={isOpen}
				aria-controls={detailId}
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? "たたむ" : "中身を見る"}
				<span className={styles.chevron}>
					<Icon name="chevron-down" size={20} />
				</span>
			</button>

			{isOpen ? (
				<div className={styles.detail} id={detailId}>
					<div className={styles.tabs}>
						<SegmentedControl
							label="見る側"
							value={side}
							onChange={setSide}
							options={[
								{
									value: "then",
									label: `${sideName(branch.ifTrue, "then")} ${branch.ifTrue.items.length}`,
								},
								{
									value: "else",
									label: `${sideName(branch.ifFalse, "else")} ${branch.ifFalse.items.length}`,
								},
							]}
						/>
					</div>

					{view.items.length === 0 ? (
						<p className={styles.empty}>まだありません。</p>
					) : (
						<ul className={styles.rows}>
							{view.items.map((item) => (
								<li className={styles.row} key={item.id}>
									<span className={styles.rowName}>{item.name}</span>
									<span className={styles.rowAmount}>{item.amount}</span>
									{item.storeName ? (
										<Tag icon="store">{item.storeName}</Tag>
									) : null}
									<IconButton
										icon="trash"
										label={`${item.name}を削除（${sideName(view, side)}）`}
										tone="plain"
										onClick={() => onRemoveItem(side, item.id)}
									/>
								</li>
							))}
						</ul>
					)}

					<Menu
						label={`${sideName(view, side)}に入れる`}
						icon="plus"
						items={[
							{
								label: "1つ追加",
								icon: "plus",
								onSelect: () => onAdd(side),
							},
							{
								label: "まとめて追加",
								icon: "rows",
								onSelect: () => onBulkAdd(side),
							},
							...(onAddFromRecipe
								? [
										{
											label: "レシピから入れる",
											icon: "book" as const,
											onSelect: () => onAddFromRecipe(side),
										},
									]
								: []),
						]}
						trigger={(props) => (
							<button
								type="button"
								className={styles.addTrigger}
								ref={props.ref}
								onClick={props.onClick}
								aria-haspopup={props["aria-haspopup"]}
								aria-expanded={props["aria-expanded"]}
								aria-controls={props["aria-controls"]}
							>
								<Icon name="plus" size={20} />
								{sideName(view, side)}に追加
							</button>
						)}
					/>
				</div>
			) : null}
		</section>
	);
}
