import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Note } from "#/components/note/note";
import {
	type RecipeSnapshotSection,
	recipeSnapshotSectionLabels,
} from "../domain/recipe-snapshot";
import * as styles from "./recipe-parent-line.css";

// もとにしたレシピの、見る人にとっての様子（drizzle-recipe-viewer-repository.ts の RecipeParentInfo と同じ形）。
export type RecipeParentView =
	| {
			status: "visible";
			publicId: string;
			name: string;
			authorName: string | null;
			changedSections: RecipeSnapshotSection[];
	  }
	| { status: "missing" };

type RecipeParentLineProps = {
	parent: RecipeParentView;
};

// 題名の下の「〇〇さんの『△△』をもとに」。継承したレシピでは、いつも出す（消せない）。
export function RecipeParentLine({ parent }: RecipeParentLineProps) {
	// 見られない・もうないは、区別しない（本文のリンクの「（見つからないレシピ）」とそろえる）。
	if (parent.status === "missing") {
		return <p className={styles.line}>（見つからないレシピ）をもとに</p>;
	}

	return (
		<p className={styles.line}>
			{parent.authorName ? `${parent.authorName}さんの` : ""}
			<Link
				className={styles.link}
				to="/recipes/$publicId"
				params={{ publicId: parent.publicId }}
			>
				『{parent.name}』
			</Link>
			をもとに
		</p>
	);
}

type RecipeParentChangeNoticeProps = {
	parent: RecipeParentView;
	// 「違いを見る」（取り込みの画面へ）。
	action: ReactNode;
};

// 子の持ち主に、写したあとで親が変わったことを知らせる（見出しの下の、全幅の欄に置く）。変わっていなければ、出さない。
export function RecipeParentChangeNotice({
	parent,
	action,
}: RecipeParentChangeNoticeProps) {
	if (parent.status !== "visible" || parent.changedSections.length === 0) {
		return null;
	}

	return (
		<Note tone="info" action={action}>
			{`もとのレシピの${parent.changedSections
				.map((section) => recipeSnapshotSectionLabels[section])
				.join("・")}が変わりました`}
		</Note>
	);
}
