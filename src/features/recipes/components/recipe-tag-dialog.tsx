import { type KeyboardEvent, useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { useMediaQuery } from "#/components/use-media-query";
import {
	addPersonalRecipeTag,
	type PublicRecipeTag,
	recipeTagLimits,
	togglePublicRecipeTag,
} from "../domain/recipe-tags";
import { PublicRecipeTagChips } from "./public-recipe-tag-chips";
import { RecipeDialog } from "./recipe-dialog";
import * as styles from "./recipe-tag-dialog.css";

type RecipeTagDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	publicTags: readonly PublicRecipeTag[];
	onPublicTagsChange: (tags: PublicRecipeTag[]) => void;
	personalTags: readonly string[];
	onPersonalTagsChange: (tags: string[]) => void;
	// 自分が他のレシピで使った個人用のタグ（多い順）。
	personalTagSuggestions?: readonly string[];
};

// 変換を確定する Enter（Safari は、確定のあとに isComposing が false・keyCode 229 で届く）では、足さない。
function isConfirmingComposition(event: KeyboardEvent<HTMLInputElement>) {
	return event.nativeEvent.isComposing || event.keyCode === 229;
}

// タグを選ぶ画面（PC は中央のダイアログ、スマホは下からのシート）。公開用は語の一覧から（分類ごとにたためる）、個人用は自由入力。
// 選んだタグは、その場でエディタに反映する（「決める」は閉じるだけ。保存はエディタの保存で）。
export function RecipeTagDialog({
	open,
	onOpenChange,
	publicTags,
	onPublicTagsChange,
	personalTags,
	onPersonalTagsChange,
	personalTagSuggestions = [],
}: RecipeTagDialogProps) {
	const publicHeadingId = useId();
	const personalHeadingId = useId();
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	const isWide = useMediaQuery("(min-width: 768px)");
	const unusedSuggestions = personalTagSuggestions.filter(
		(tag) => !personalTags.includes(tag),
	);

	function addPersonalTag(text: string) {
		const result = addPersonalRecipeTag(personalTags, text);

		if (result.status === "rejected") {
			setError(result.message);

			return;
		}

		onPersonalTagsChange(result.tags);
		setDraft("");
		setError(null);
	}

	return (
		<RecipeDialog
			open={open}
			onOpenChange={onOpenChange}
			title="タグ"
			narrow
			footer={
				<Button
					size={isWide ? "lg" : "md"}
					fullWidth={!isWide}
					onClick={() => onOpenChange(false)}
				>
					決める
				</Button>
			}
		>
			<div className={styles.body}>
				<section className={styles.section} aria-labelledby={publicHeadingId}>
					<div className={styles.sectionHeader}>
						<h3 className={styles.sectionTitle} id={publicHeadingId}>
							公開用のタグ
						</h3>
						<span className={styles.count}>
							{publicTags.length}／{recipeTagLimits.maxPublicTags}
						</span>
					</div>
					<p className={styles.hint}>
						公開したとき、みんなのレシピで探せます。
						{recipeTagLimits.maxPublicTags}
						つまで選べます。
					</p>
					<PublicRecipeTagChips
						selected={publicTags}
						max={recipeTagLimits.maxPublicTags}
						onToggle={(tag) =>
							onPublicTagsChange(togglePublicRecipeTag(publicTags, tag))
						}
					/>
				</section>

				<section className={styles.section} aria-labelledby={personalHeadingId}>
					<div className={styles.sectionHeader}>
						<h3 className={styles.sectionTitle} id={personalHeadingId}>
							個人用のタグ
						</h3>
						<span className={styles.count}>
							{personalTags.length}／{recipeTagLimits.maxPersonalTags}
						</span>
					</div>
					<p className={styles.hint}>
						自分だけに見えます（「昼ご飯」「お弁当」など）。
					</p>
					{personalTags.length > 0 ? (
						<ChipGroup label="付けた個人用のタグ">
							{personalTags.map((tag) => (
								<Chip
									key={tag}
									icon="close"
									aria-label={`${tag}を外す`}
									onClick={() =>
										onPersonalTagsChange(
											personalTags.filter((current) => current !== tag),
										)
									}
								>
									{tag}
								</Chip>
							))}
						</ChipGroup>
					) : null}
					<div className={styles.addRow}>
						<div className={styles.addInput}>
							<Field label="個人用のタグを足す" hideLabel error={error}>
								{(control) => (
									<TextInput
										{...control}
										value={draft}
										placeholder="タグを入れる"
										enterKeyHint="done"
										onChange={(event) => {
											setDraft(event.target.value);
											setError(null);
										}}
										onKeyDown={(event) => {
											if (event.key !== "Enter") {
												return;
											}

											// エディタのフォームを送らない。
											event.preventDefault();

											if (!isConfirmingComposition(event)) {
												addPersonalTag(draft);
											}
										}}
									/>
								)}
							</Field>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => addPersonalTag(draft)}
						>
							足す
						</Button>
					</div>
					{unusedSuggestions.length > 0 ? (
						<ChipGroup label="使ったことのあるタグ">
							{unusedSuggestions.map((tag) => (
								<Chip key={tag} icon="plus" onClick={() => addPersonalTag(tag)}>
									{tag}
								</Chip>
							))}
						</ChipGroup>
					) : null}
				</section>
			</div>
		</RecipeDialog>
	);
}
