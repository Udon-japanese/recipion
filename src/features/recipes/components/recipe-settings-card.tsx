import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { Card } from "#/components/card/card";
import { Checkbox } from "#/components/checkbox/checkbox";
import { SelectBox } from "#/components/field/field";
import { Note } from "#/components/note/note";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import { recipeVisibilityLabels } from "../domain/recipe-visibility-label";
import * as styles from "./recipe-settings-card.css";

type RecipeSettingsCardProps = {
	visibility: RecipeVisibility;
	onVisibilityChange: (value: RecipeVisibility) => void;
	// 引用元のURLが入っているか（入っているレシピは、公開できない）。
	hasSourceUrl: boolean;
	stocksWhenMade: boolean;
	onStocksWhenMadeChange: (value: boolean) => void;
};

const visibilityHints: Record<RecipeVisibility, string> = {
	private: "自分だけが見られます",
	unlisted: "パスフレーズを知っている人が見られます",
	public: "ログインした人なら誰でも見られます",
};

const visibilityOrder: readonly RecipeVisibility[] = [
	"private",
	"unlisted",
	"public",
];

function isRecipeVisibility(value: string): value is RecipeVisibility {
	return visibilityOrder.some((visibility) => visibility === value);
}

// レシピの設定（公開範囲・作り置き）。設定が増えても、行が1つずつ増えるだけにする。
// 公開を選んだら、注意書きを出す（保存するときの確認でも、もう一度出す。recipe-editor.tsx）。
export function RecipeSettingsCard({
	visibility,
	onVisibilityChange,
	hasSourceUrl,
	stocksWhenMade,
	onStocksWhenMadeChange,
}: RecipeSettingsCardProps) {
	const headingId = useId();
	const visibilityId = useId();
	const stocksId = useId();

	return (
		<section className={styles.container} aria-labelledby={headingId}>
			<h2 className={styles.heading} id={headingId}>
				設定
			</h2>
			<Card>
				<ul className={styles.list}>
					<li className={styles.row}>
						<div className={styles.text}>
							<label className={styles.label} htmlFor={visibilityId}>
								公開範囲
							</label>
							<span className={styles.hint}>{visibilityHints[visibility]}</span>
						</div>
						<div className={styles.select}>
							<SelectBox
								id={visibilityId}
								value={visibility}
								onChange={(event) => {
									if (isRecipeVisibility(event.target.value)) {
										onVisibilityChange(event.target.value);
									}
								}}
							>
								{visibilityOrder.map((option) => (
									<option
										key={option}
										value={option}
										disabled={hasSourceUrl && option !== "private"}
									>
										{recipeVisibilityLabels[option]}
									</option>
								))}
							</SelectBox>
						</div>
					</li>
					<li className={styles.row}>
						<div className={styles.text}>
							<label className={styles.label} htmlFor={stocksId} aria-hidden>
								作り置き
							</label>
							<span className={styles.hint}>
								つくったとき、できあがりを在庫に入れる
							</span>
						</div>
						<Checkbox
							id={stocksId}
							label="作り置き"
							checked={stocksWhenMade}
							onChange={(event) => onStocksWhenMadeChange(event.target.checked)}
						/>
					</li>
				</ul>
			</Card>

			{hasSourceUrl ? (
				<Note tone="warn">引用元のURLがあるレシピは公開できません。</Note>
			) : null}
			{visibility === "unlisted" ? (
				<p className={styles.note}>
					保存するとパスフレーズが作られ、レシピの画面で確認できます。
				</p>
			) : null}
			{visibility !== "private" ? (
				<Note tone="info">
					自分で考えたか、自分の言葉で書いたレシピだけを公開してください。レシピと一緒に、アバター・表示名・ハンドルも公開されます（
					<Link to="/profile" target="_blank" rel="noreferrer">
						プロフィール
					</Link>
					で変えられます）。内容は公開の前に自動で確認します（
					<Link to="/terms" target="_blank" rel="noreferrer">
						利用規約
					</Link>
					）。
				</Note>
			) : null}
		</section>
	);
}
