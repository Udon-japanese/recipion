import { useEffect, useRef, useState } from "react";
import { describeError } from "#/errors/user-facing-error";
import { filterLinkTargets } from "../domain/filter-link-targets";
import { buildLinkTargetHints } from "../domain/link-target-hints";
import {
	filterOtherRecipes,
	type LinkableUser,
	makeOtherRecipeLabelBase,
	type OtherRecipeTarget,
} from "../domain/other-recipe-links";
import type { RecipeLinkTarget } from "../domain/recipe-links";
import * as styles from "./recipe-link-picker.css";

type RecipeLinkPickerProps = {
	title: string;
	targets: readonly RecipeLinkTarget[];
	status: "loading" | "ready" | "error";
	onSelect: (target: RecipeLinkTarget) => void;
	onClose: () => void;
	// 渡すと、「他の人のレシピ」の切り替えが使える（ユーザーを探して、そのユーザーの全体公開レシピを選ぶ）。
	searchUsers?: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes?: (handle: string) => Promise<OtherRecipeTarget[]>;
};

const maxShown = 30;

type Mode = "mine" | "others";

// リンクするレシピを、一覧から選ぶ（名前で絞れる）。入力欄の下に開く。
export function RecipeLinkPicker({
	title,
	targets,
	status,
	onSelect,
	onClose,
	searchUsers,
	loadUserRecipes,
}: RecipeLinkPickerProps) {
	const [mode, setMode] = useState<Mode>("mine");
	const [query, setQuery] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const shown = filterLinkTargets(targets, query, maxShown);
	// 同じ名前のレシピが複数あるときは、登録日を添えて、見分けられるようにする。
	const hints = buildLinkTargetHints(targets);
	const canPickOthers = Boolean(searchUsers && loadUserRecipes);

	useEffect(() => {
		searchRef.current?.focus();
	}, []);

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		// Enter で、入力欄のあるフォーム（レシピの保存）が、送信されないようにする。変換中の Enter は、IME に任せる。
		if (event.key === "Enter") {
			event.preventDefault();
		}

		if (event.key === "Escape" && !event.nativeEvent.isComposing) {
			onClose();
		}
	}

	return (
		<section className={styles.picker} aria-label={title}>
			<div className={styles.header}>
				<p className={styles.title}>{title}</p>
				<button type="button" onClick={onClose}>
					閉じる
				</button>
			</div>

			{canPickOthers ? (
				<fieldset className={styles.modes} aria-label="レシピの種類">
					<button
						type="button"
						aria-pressed={mode === "mine"}
						onClick={() => {
							setMode("mine");
							setQuery("");
						}}
					>
						自分のレシピ
					</button>
					<button
						type="button"
						aria-pressed={mode === "others"}
						onClick={() => {
							setMode("others");
							setQuery("");
						}}
					>
						他の人のレシピ
					</button>
				</fieldset>
			) : null}

			{mode === "others" && searchUsers && loadUserRecipes ? (
				<OtherRecipesPicker
					searchUsers={searchUsers}
					loadUserRecipes={loadUserRecipes}
					onSelect={onSelect}
					onKeyDown={handleKeyDown}
				/>
			) : (
				<>
					<input
						ref={searchRef}
						className={styles.search}
						aria-label="レシピを探す"
						placeholder="レシピの名前で探す"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={handleKeyDown}
					/>

					{status === "loading" ? (
						<p className={styles.message}>読み込んでいます…</p>
					) : null}
					{status === "error" ? (
						<p className={styles.message} role="alert">
							レシピの一覧を読み込めませんでした。
						</p>
					) : null}
					{status === "ready" && targets.length === 0 ? (
						<p className={styles.message}>
							リンクできるレシピが、まだありません。
						</p>
					) : null}
					{status === "ready" && targets.length > 0 && shown.length === 0 ? (
						<p className={styles.message}>見つかりません。</p>
					) : null}

					{shown.length > 0 ? (
						<ul className={styles.list}>
							{shown.map((target) => (
								<li key={target.publicId}>
									<button
										type="button"
										className={styles.item}
										onClick={() => onSelect(target)}
									>
										{target.name}
										{hints.has(target.publicId) ? (
											<span className={styles.hint}>
												{" ・ "}
												{hints.get(target.publicId)}
											</span>
										) : null}
									</button>
								</li>
							))}
						</ul>
					) : null}
				</>
			)}
		</section>
	);
}

type OtherRecipesPickerProps = {
	searchUsers: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes: (handle: string) => Promise<OtherRecipeTarget[]>;
	onSelect: (target: RecipeLinkTarget) => void;
	onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

// 他の人のレシピ：ユーザーを探す → そのユーザーの全体公開レシピを選ぶ。
function OtherRecipesPicker({
	searchUsers,
	loadUserRecipes,
	onSelect,
	onKeyDown,
}: OtherRecipesPickerProps) {
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<LinkableUser[] | null>(null);
	const [selectedUser, setSelectedUser] = useState<LinkableUser | null>(null);
	const [recipes, setRecipes] = useState<OtherRecipeTarget[] | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		searchRef.current?.focus();
	}, []);

	// ユーザーを探す（打ち終わるのを少し待つ）。
	useEffect(() => {
		if (selectedUser) {
			return;
		}

		let isCancelled = false;
		const timer = window.setTimeout(() => {
			searchUsers(query)
				.then((found) => {
					if (!isCancelled) {
						setUsers(found);
						setErrorMessage(null);
					}
				})
				.catch((error: unknown) => {
					if (!isCancelled) {
						setUsers([]);
						setErrorMessage(
							describeError(error, "ユーザーを探せませんでした。"),
						);
					}
				});
		}, 250);

		return () => {
			isCancelled = true;
			window.clearTimeout(timer);
		};
	}, [query, selectedUser, searchUsers]);

	function handleSelectUser(user: LinkableUser) {
		setSelectedUser(user);
		setQuery("");
		setRecipes(null);
		setErrorMessage(null);

		loadUserRecipes(user.handle)
			.then(setRecipes)
			.catch((error: unknown) => {
				setRecipes([]);
				setErrorMessage(describeError(error, "レシピを読み込めませんでした。"));
			});
	}

	if (selectedUser) {
		const shown = filterOtherRecipes(
			recipes ?? [],
			selectedUser.handle,
			query,
			maxShown,
		);
		const hints = buildLinkTargetHints(recipes ?? []);

		return (
			<>
				<p className={styles.message}>
					{selectedUser.name}（@{selectedUser.handle}）のレシピ
					<button
						type="button"
						onClick={() => {
							setSelectedUser(null);
							setQuery("");
						}}
					>
						ユーザーを選び直す
					</button>
				</p>
				<input
					ref={searchRef}
					className={styles.search}
					aria-label="レシピを探す"
					placeholder="レシピの名前で絞る"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={onKeyDown}
				/>
				{recipes === null ? (
					<p className={styles.message}>読み込んでいます…</p>
				) : null}
				{errorMessage ? (
					<p className={styles.message} role="alert">
						{errorMessage}
					</p>
				) : null}
				{recipes !== null && shown.length === 0 && !errorMessage ? (
					<p className={styles.message}>公開されているレシピがありません。</p>
				) : null}
				{shown.length > 0 ? (
					<ul className={styles.list}>
						{shown.map((recipe) => (
							<li key={recipe.publicId}>
								<button
									type="button"
									className={styles.item}
									onClick={() =>
										onSelect({
											publicId: recipe.publicId,
											// 本文に入るラベルは、「表示名の料理名」。
											name: makeOtherRecipeLabelBase(
												recipe.authorName,
												recipe.name,
											),
											createdAt: recipe.createdAt,
										})
									}
								>
									{recipe.name}
									{hints.has(recipe.publicId) ? (
										<span className={styles.hint}>
											{" ・ "}
											{hints.get(recipe.publicId)}
										</span>
									) : null}
								</button>
							</li>
						))}
					</ul>
				) : null}
			</>
		);
	}

	return (
		<>
			<input
				ref={searchRef}
				className={styles.search}
				aria-label="ユーザーを探す"
				placeholder="表示名か、ハンドルで探す"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				onKeyDown={onKeyDown}
			/>
			{users === null ? (
				<p className={styles.message}>読み込んでいます…</p>
			) : null}
			{errorMessage ? (
				<p className={styles.message} role="alert">
					{errorMessage}
				</p>
			) : null}
			{users !== null && users.length === 0 && !errorMessage ? (
				<p className={styles.message}>
					全体公開のレシピがある人が、見つかりません。
				</p>
			) : null}
			{users !== null && users.length > 0 ? (
				<ul className={styles.list}>
					{users.map((user) => (
						<li key={user.handle}>
							<button
								type="button"
								className={styles.item}
								onClick={() => handleSelectUser(user)}
							>
								{user.name}（@{user.handle}）
							</button>
						</li>
					))}
				</ul>
			) : null}
		</>
	);
}
