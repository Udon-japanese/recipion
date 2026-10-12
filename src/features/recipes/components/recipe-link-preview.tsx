import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import type { RecipeDetail } from "../application/recipe-repository";
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
	const titleId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);
	const current = stack.at(-1) ?? initialPublicId;
	const state: LoadState = states[current] ?? { status: "loading" };

	useEffect(() => {
		closeRef.current?.focus();
	}, []);

	// Esc で閉じる。
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.isComposing) {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

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

	return (
		<>
			<button
				type="button"
				className={styles.backdrop}
				aria-label="閉じる"
				tabIndex={-1}
				onClick={onClose}
			/>

			<div
				className={styles.panel}
				role="dialog"
				aria-modal="true"
				aria-labelledby={state.status === "ready" ? titleId : undefined}
				aria-label={state.status === "ready" ? undefined : "レシピのプレビュー"}
			>
				<div className={styles.header}>
					{stack.length > 1 ? (
						<button
							type="button"
							onClick={() => setStack((current) => current.slice(0, -1))}
						>
							戻る
						</button>
					) : (
						<span />
					)}
					<button ref={closeRef} type="button" onClick={onClose}>
						閉じる
					</button>
				</div>

				<div className={styles.body}>
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
					{state.status === "ready" && state.recipe.author ? (
						<p className={styles.message}>
							作者：{state.recipe.author.name}（@{state.recipe.author.handle}）
						</p>
					) : null}
					{state.status === "ready" ? (
						<RecipeViewWithTree
							loadLinkedRecipes={loadLinkedRecipes}
							recipe={state.recipe}
							titleId={titleId}
							onOpenLink={(publicId) =>
								setStack((currentStack) => [...currentStack, publicId])
							}
						/>
					) : null}
				</div>

				<div className={styles.footer}>{renderOpenLink(current)}</div>
			</div>
		</>
	);
}
