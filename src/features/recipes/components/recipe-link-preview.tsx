import { type ReactNode, useCallback, useEffect, useState } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { Note } from "#/components/note/note";
import type { RecipeDetail } from "../application/recipe-repository";
import { parseRecipeYield } from "../domain/recipe-yield";
import { RecipeAuthorByline } from "./recipe-author-byline";
import { RecipeDialog } from "./recipe-dialog";
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
	// 最初のレシピの、何回分を見せるか（材料のリンクの矢印から開いたとき。省略は 1）。
	initialRatio?: number;
	// リンク先のレシピを取ってくる（見つからなければ null）。
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	// 「レシピを開く」のリンク（画面の移動の方法は、呼び出し側が決める）。
	renderOpenLink: (publicId: string, wanted?: number) => ReactNode;
	// 材料のリンク先を、まとめて取ってくる（材料の下に、その場で開く）。
	loadLinkedRecipes?: LoadLinkedRecipes;
	// 前もって取ってあるレシピ（あれば、読み込みを待たずに出す）。
	preloadedRecipes?: Readonly<Record<string, RecipeDetail>>;
	onClose: () => void;
};

// 開いた先で見せる、できあがりの数（増減できないレシピは、なし＝元の量で開く）。
function wantedYieldQuantity(yieldText: string, ratio: number) {
	const recipeYield = parseRecipeYield(yieldText);

	return recipeYield
		? Number((recipeYield.quantity * ratio).toFixed(3))
		: undefined;
}

// リンクを押したときの、読み取り専用のプレビュー。中のリンクも押せる（枠の中身が、そのレシピに替わる。「戻る」で戻る）。
export function RecipeLinkPreview({
	initialPublicId,
	initialRatio = 1,
	loadRecipe,
	renderOpenLink,
	loadLinkedRecipes,
	preloadedRecipes,
	onClose,
}: RecipeLinkPreviewProps) {
	// 開いたレシピの道すじ（それぞれ、何回分を見せるか）。
	const [stack, setStack] = useState<{ publicId: string; ratio: number }[]>([
		{ publicId: initialPublicId, ratio: initialRatio },
	]);
	const [states, setStates] = useState<Record<string, LoadState>>(() =>
		Object.fromEntries(
			Object.entries(preloadedRecipes ?? {}).map(
				([publicId, recipe]): [string, LoadState] => [
					publicId,
					{ status: "ready", recipe },
				],
			),
		),
	);
	const currentEntry = stack.at(-1) ?? {
		publicId: initialPublicId,
		ratio: initialRatio,
	};
	const current = currentEntry.publicId;
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
	// 「レシピを開く」を押したら、このプレビューは閉じる（別のタブで開いたとき、元のタブに開いたまま残さない）。
	// リンクの移動が済んでから閉じる（先に消すと、リンクが働かない）。
	const footer = (
		// biome-ignore lint/a11y/noStaticElementInteractions: 中のリンクの押下を受けて閉じるだけ（操作は中のリンク）。
		// biome-ignore lint/a11y/useKeyWithClickEvents: キーボードで押したリンクも click になる。
		<div
			className={styles.footer}
			onClick={(event) => {
				if (event.target instanceof Element && event.target.closest("a")) {
					window.setTimeout(onClose);
				}
			}}
		>
			{renderOpenLink(
				current,
				state.status === "ready" && currentEntry.ratio !== 1
					? wantedYieldQuantity(state.recipe.yieldText, currentEntry.ratio)
					: undefined,
			)}
		</div>
	);
	const body = (
		<>
			{state.status === "loading" ? (
				<Note tone="info" spinning>
					読み込んでいます…
				</Note>
			) : null}
			{state.status === "missing" ? (
				<Note>レシピが見つかりません。</Note>
			) : null}
			{state.status === "error" ? (
				<Note tone="error">レシピを読み込めませんでした。</Note>
			) : null}
			{state.status === "ready" ? (
				<RecipeViewWithTree
					loadLinkedRecipes={loadLinkedRecipes}
					preloadedLinkedRecipes={preloadedRecipes}
					recipe={state.recipe}
					ratio={currentEntry.ratio}
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
					onOpenLink={(publicId, _trigger, ratio = 1) =>
						setStack((currentStack) => [...currentStack, { publicId, ratio }])
					}
				/>
			) : null}
		</>
	);

	return (
		<RecipeDialog
			open
			onOpenChange={handleOpenChange}
			title={title}
			headerLeading={backButton}
			footer={footer}
		>
			{body}
		</RecipeDialog>
	);
}
