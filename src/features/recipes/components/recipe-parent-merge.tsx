import { useState } from "react";
import { Button } from "#/components/button/button";
import { Card } from "#/components/card/card";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import {
	type ConflictChoice,
	countConflicts,
	resolveSectionText,
	type SectionMerge,
} from "../domain/merge-recipe-snapshot";
import {
	type RecipeSnapshotSection,
	recipeSnapshotSectionLabels,
} from "../domain/recipe-snapshot";
import * as styles from "./recipe-parent-merge.css";

type RecipeParentMergeProps = {
	parentName: string;
	parentAuthorName: string | null;
	merges: readonly SectionMerge[];
	// 取り込んだ結果（変わった部分ごとの文章）で、エディタを開く（保存は、エディタで本人がする）。
	onOpenEditor: (
		resolved: Partial<Record<RecipeSnapshotSection, string>>,
	) => void;
	// 「今回の変更は取り込まない」。
	onDismiss: () => Promise<void>;
	onCancel: () => void;
	// 上に出す知らせ（親がまた変わったので、最新の内容で比べ直した、など）。
	notice?: string | null;
};

const choiceOptions: readonly { value: ConflictChoice; label: string }[] = [
	{ value: "parent", label: "もとのレシピの行にする" },
	{ value: "mine", label: "このレシピの行のままにする" },
	{ value: "both", label: "両方を残す" },
];

const sourceLabels = {
	parent: "もとのレシピの変更",
	mine: "このレシピで直したところ",
} as const;

// 親の変更を取り込む画面。変わった部分ごとに、取り込んだ結果を見せ、ぶつかったところだけ選んでもらう。
export function RecipeParentMerge({
	parentName,
	parentAuthorName,
	merges,
	onOpenEditor,
	onDismiss,
	onCancel,
	notice,
}: RecipeParentMergeProps) {
	// 部分ごとの、ぶつかりの選び方（ぶつかりの順）。
	const [choices, setChoices] = useState<
		Partial<Record<RecipeSnapshotSection, (ConflictChoice | undefined)[]>>
	>({});
	const [isDismissing, setIsDismissing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const conflictCount = countConflicts(merges);
	const resolved = Object.fromEntries(
		merges.map((merge) => [
			merge.section,
			resolveSectionText(merge.blocks, choices[merge.section] ?? []),
		]),
	) as Partial<Record<RecipeSnapshotSection, string | null>>;
	const isReady = Object.values(resolved).every((text) => text !== null);

	function choose(
		section: RecipeSnapshotSection,
		index: number,
		choice: ConflictChoice,
	) {
		setChoices((current) => {
			const next = [...(current[section] ?? [])];

			next[index] = choice;

			return { ...current, [section]: next };
		});
	}

	async function handleDismiss() {
		setIsDismissing(true);
		setErrorMessage(null);

		try {
			await onDismiss();
		} catch (error) {
			setErrorMessage(
				error instanceof Error && error.message
					? error.message
					: "うまくいきませんでした。もう一度お試しください",
			);
			setIsDismissing(false);
		}
	}

	return (
		<section className={styles.container} aria-labelledby="parent-merge-title">
			<h1 className={styles.title} id="parent-merge-title">
				もとのレシピの変更を取り込む
			</h1>
			{notice ? <Note tone="warn">{notice}</Note> : null}
			<p className={styles.lead}>
				{`${parentAuthorName ? `${parentAuthorName}さんの` : ""}『${parentName}』で変わったところを、このレシピに当てます。このレシピで直したところは、残します。`}
				{conflictCount > 0
					? `両方で変わったところが${conflictCount}か所あります。どちらにするかを選んでください。`
					: ""}
			</p>

			{merges.map((merge) => {
				let conflictIndex = -1;

				return (
					<Card key={merge.section} padding="md">
						<h2 className={styles.sectionTitle}>
							{recipeSnapshotSectionLabels[merge.section]}
						</h2>
						<div className={styles.blocks}>
							{merge.blocks.map((block, blockIndex) => {
								if (block.kind === "ok") {
									return (
										<div
											// 並びは変わらないので、位置を key にする。
											// biome-ignore lint/suspicious/noArrayIndexKey: 取り込みの結果は、この画面のあいだ並びが変わらない。
											key={blockIndex}
											className={styles.lines}
											data-source={block.source}
										>
											{block.source === "base" ? null : (
												<span className={styles.sourceLabel}>
													{sourceLabels[block.source]}
												</span>
											)}
											{block.lines.map((line, lineIndex) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: 同じ文字の行もあるので、位置で区別する。
												<p className={styles.line} key={lineIndex}>
													{line}
												</p>
											))}
										</div>
									);
								}

								conflictIndex += 1;
								const index = conflictIndex;

								return (
									// biome-ignore lint/suspicious/noArrayIndexKey: 取り込みの結果は、この画面のあいだ並びが変わらない。
									<div className={styles.conflict} key={blockIndex}>
										<p className={styles.conflictTitle}>両方で変わっています</p>
										<div className={styles.sides}>
											<div>
												<span className={styles.sourceLabel}>もとのレシピ</span>
												{block.parent.length === 0 ? (
													<p className={styles.empty}>（消した）</p>
												) : (
													block.parent.map((line, lineIndex) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: 同じ文字の行もあるので、位置で区別する。
														<p className={styles.line} key={lineIndex}>
															{line}
														</p>
													))
												)}
											</div>
											<div>
												<span className={styles.sourceLabel}>このレシピ</span>
												{block.mine.length === 0 ? (
													<p className={styles.empty}>（消した）</p>
												) : (
													block.mine.map((line, lineIndex) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: 同じ文字の行もあるので、位置で区別する。
														<p className={styles.line} key={lineIndex}>
															{line}
														</p>
													))
												)}
											</div>
										</div>
										<RadioList<ConflictChoice | "">
											legend="どちらにしますか"
											name={`conflict-${merge.section}-${index}`}
											options={choiceOptions}
											value={choices[merge.section]?.[index] ?? ""}
											onChange={(value) => {
												if (value !== "") {
													choose(merge.section, index, value);
												}
											}}
										/>
									</div>
								);
							})}
						</div>
					</Card>
				);
			})}

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

			<div className={styles.actions}>
				<Button
					disabled={!isReady || isDismissing}
					onClick={() => {
						const texts: Partial<Record<RecipeSnapshotSection, string>> = {};

						for (const merge of merges) {
							const text = resolved[merge.section];

							if (text !== null && text !== undefined) {
								texts[merge.section] = text;
							}
						}

						onOpenEditor(texts);
					}}
				>
					エディタで開く
				</Button>
				<Button
					variant="secondary"
					status={isDismissing ? "pending" : "idle"}
					pendingLabel="記録しています"
					onClick={() => void handleDismiss()}
				>
					今回の変更は取り込まない
				</Button>
				<Button variant="secondary" disabled={isDismissing} onClick={onCancel}>
					やめる
				</Button>
			</div>
			{isReady ? null : (
				<p className={styles.hint}>
					両方で変わったところを、すべて選ぶと、エディタで開けます。
				</p>
			)}
		</section>
	);
}
