import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Modal } from "#/components/dialog/modal";
import { IconButton } from "#/components/icon-button/icon-button";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeAuthorByline } from "./recipe-author-byline";
import * as styles from "./recipe-link-preview.css";
import {
	type LoadLinkedRecipes,
	RecipeViewWithTree,
} from "./recipe-view-with-tree";

type LoadState =
	| { status: "loading" }
	| { status: "ready"; recipe: RecipeDetail }
	| { status: "missing" }
	| { status: "error" };

type RecipeLinkPreviewProps = {
	initialPublicId: string;
	// リンク先のレシピを取ってくる（見つからなければ null）。
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	// 「レシピを開く」のリンク（画面の移動の方法は、呼び出し側が決める）。
	renderOpenLink: (publicId: string) => ReactNode;
	// 材料のリンク先を、まとめて取ってくる（材料の下に、その場で開く）。
	loadLinkedRecipes?: LoadLinkedRecipes;
	onClose: () => void;
};

// リンクを押したときの、読み取り専用のプレビュー。中のリンクも押せる（枠の中身が、そのレシピに替わる。「戻る」で戻る）。
export function RecipeLinkPreview({
	initialPublicId,
	loadRecipe,
	renderOpenLink,
	loadLinkedRecipes,
	onClose,
}: RecipeLinkPreviewProps) {
	const [stack, setStack] = useState<string[]>([initialPublicId]);
	const [states, setStates] = useState<Record<string, LoadState>>({});
	const isWide = useMediaQuery("(min-width: 768px)");
	const current = stack.at(-1) ?? initialPublicId;
	const state: LoadState = states[current] ?? { status: "loading" };

	const load = useCallback(
		(publicId: string) => {
			setStates((current) => ({
				...current,
				[publicId]: { status: "loading" },
			}));
			loadRecipe(publicId)
				.then((recipe) => {
					setStates((current) => ({
						...current,
						[publicId]: recipe
							? { status: "ready", recipe }
							: { status: "missing" },
					}));
				})
				.catch(() => {
					setStates((current) => ({
						...current,
						[publicId]: { status: "error" },
					}));
				});
		},
		[loadRecipe],
	);

	// まだ取っていないレシピだけ、取ってくる。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 表示するレシピが替わったときだけ、取る（取った結果の状態では、取り直さない）。
	useEffect(() => {
		if (!states[current]) {
			load(current);
		}
	}, [current, load]);

	const title =
		state.status === "ready" ? state.recipe.name : "レシピのプレビュー";
	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};
	const backButton =
		stack.length > 1 ? (
			<IconButton
				icon="chevron-left"
				label="戻る"
				size="std"
				tone="plain"
				onClick={() => setStack((current) => current.slice(0, -1))}
			/>
		) : null;
	const footer = <div className={styles.footer}>{renderOpenLink(current)}</div>;
	const body = (
		<>
			{state.status === "loading" ? (
				<p className={styles.message}>読み込んでいます…</p>
			) : null}
			{state.status === "missing" ? (
				<p className={styles.message}>レシピが見つかりません。</p>
			) : null}
			{state.status === "error" ? (
				<p className={styles.message} role="alert">
					レシピを読み込めませんでした。
				</p>
			) : null}
			{state.status === "ready" ? (
				<RecipeViewWithTree
					loadLinkedRecipes={loadLinkedRecipes}
					recipe={state.recipe}
					hideTitle
					compact
					badges={
						state.recipe.author ? (
							<RecipeAuthorByline
								name={state.recipe.author.name}
								handle={state.recipe.author.handle}
							/>
						) : undefined
					}
					onOpenLink={(publicId) =>
						setStack((currentStack) => [...currentStack, publicId])
					}
				/>
			) : null}
		</>
	);

	// PC は、中央の広いダイアログ（材料と作り方を左右に並べる）。スマホは、下からのシート。
	if (isWide) {
		return (
			<Modal
				open
				onOpenChange={handleOpenChange}
				title={title}
				headerLeading={backButton}
				footer={footer}
			>
				{body}
			</Modal>
		);
	}

	return (
		<Sheet
			open
			onOpenChange={handleOpenChange}
			title={title}
			placement="bottom"
			snapPoints={[0.7, 0.92]}
			headerLeading={backButton}
			footer={footer}
		>
			{body}
		</Sheet>
	);
}
