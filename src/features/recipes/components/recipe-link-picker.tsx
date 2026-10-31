import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { Note } from "#/components/note/note";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
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
import { RecipeDialog } from "./recipe-dialog";
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
	// 覚えている他の人のレシピの検索結果を捨てる（「更新」を押したとき。そのあと、取り直す）。
	onRefresh?: () => void;
};

const maxShown = 30;

type Mode = "mine" | "others";

// リンクするレシピを、一覧から選ぶ（名前で絞れる）。シートで開く（広い画面は右から、狭い画面は下から）。
export function RecipeLinkPicker({
	title,
	targets,
	status,
	onSelect,
	onClose,
	searchUsers,
	loadUserRecipes,
	onRefresh,
}: RecipeLinkPickerProps) {
	const [mode, setMode] = useState<Mode>("mine");
	const [hasVisitedOthers, setHasVisitedOthers] = useState(false);
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
		// Enter で、入力欄のあるフォーム（レシピの保存）が、送信されないようにする。変換中の Enter は、IME に任せる。Esc は、シートが閉じる。
		if (event.key === "Enter") {
			event.preventDefault();
		}
	}

	return (
		<RecipeDialog
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			title={title}
		>
			<div className={styles.body}>
				{canPickOthers ? (
					<SegmentedControl<Mode>
						label="レシピの種類"
						value={mode}
						options={[
							{ value: "mine", label: "自分のレシピ" },
							{ value: "others", label: "他の人のレシピ" },
						]}
						onChange={(next) => {
							setMode(next);

							// 他の人のレシピは、初めて開くときに作り、以後は、残す（切り替えるたびに取り直さない）。
							if (next === "others") {
								setHasVisitedOthers(true);
							}
						}}
					/>
				) : null}

				<div className={styles.body} hidden={mode !== "mine"}>
					<Field label="レシピを探す" hideLabel>
						{(control) => (
							<TextInput
								{...control}
								ref={searchRef}
								placeholder="レシピの名前で探す"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								onKeyDown={handleKeyDown}
							/>
						)}
					</Field>

					{status === "loading" ? (
						<Note tone="info" spinning>
							読み込んでいます…
						</Note>
					) : null}
					{status === "error" ? (
						<Note tone="error">レシピの一覧を読み込めませんでした。</Note>
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
										<span className={styles.itemText}>
											{target.name}
											{hints.has(target.publicId) ? (
												<span className={styles.hint}>
													{" ・ "}
													{hints.get(target.publicId)}
												</span>
											) : null}
										</span>
										<Icon name="chevron-right" size={20} />
									</button>
								</li>
							))}
						</ul>
					) : null}
				</div>
				{searchUsers && loadUserRecipes && hasVisitedOthers ? (
					<div className={styles.body} hidden={mode !== "others"}>
						<OtherRecipesPicker
							searchUsers={searchUsers}
							loadUserRecipes={loadUserRecipes}
							onSelect={onSelect}
							onKeyDown={handleKeyDown}
							onRefresh={onRefresh}
						/>
					</div>
				) : null}
			</div>
		</RecipeDialog>
	);
}

type OtherRecipesPickerProps = {
	searchUsers: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes: (handle: string) => Promise<OtherRecipeTarget[]>;
	onSelect: (target: RecipeLinkTarget) => void;
	onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
	// 覚えている検索結果を捨てる（「更新」）。
	onRefresh?: () => void;
};

// 他の人のレシピ：ユーザーを探す → そのユーザーの全体公開レシピを選ぶ。
function OtherRecipesPicker({
	searchUsers,
	loadUserRecipes,
	onSelect,
	onKeyDown,
	onRefresh,
}: OtherRecipesPickerProps) {
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<LinkableUser[] | null>(null);
	const [selectedUser, setSelectedUser] = useState<LinkableUser | null>(null);
	const [recipes, setRecipes] = useState<OtherRecipeTarget[] | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// 「更新」で増やす。ユーザーの検索を、取り直すきっかけ。
	const [reloadTick, setReloadTick] = useState(0);
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		searchRef.current?.focus();
	}, []);

	// ユーザーを探す（打ち終わるのを少し待つ）。
	// biome-ignore lint/correctness/useExhaustiveDependencies: reloadTick は、「更新」で取り直すためのきっかけ。
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
	}, [query, selectedUser, searchUsers, reloadTick]);

	function loadRecipes(user: LinkableUser) {
		setRecipes(null);
		setErrorMessage(null);

		loadUserRecipes(user.handle)
			.then(setRecipes)
			.catch((error: unknown) => {
				setRecipes([]);
				setErrorMessage(describeError(error, "レシピを読み込めませんでした。"));
			});
	}

	function handleSelectUser(user: LinkableUser) {
		setSelectedUser(user);
		setQuery("");
		loadRecipes(user);
	}

	// 覚えている結果を捨てて、いまの画面を、取り直す。
	function handleRefresh() {
		onRefresh?.();

		if (selectedUser) {
			loadRecipes(selectedUser);
		} else {
			setUsers(null);
			setReloadTick((tick) => tick + 1);
		}
	}

	const refreshButton = onRefresh ? (
		<div className={styles.toolbar}>
			<Button
				variant="ghost"
				size="sm"
				leadingIcon={<Icon name="refresh" size={20} />}
				onClick={handleRefresh}
			>
				更新
			</Button>
		</div>
	) : null;

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
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setSelectedUser(null);
							setQuery("");
						}}
					>
						ユーザーを選び直す
					</Button>
				</p>
				<Field label="レシピを探す" hideLabel>
					{(control) => (
						<TextInput
							{...control}
							ref={searchRef}
							placeholder="レシピの名前で絞る"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={onKeyDown}
						/>
					)}
				</Field>
				{recipes === null ? (
					<Note tone="info" spinning>
						読み込んでいます…
					</Note>
				) : null}
				{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
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
									<span className={styles.itemText}>
										{recipe.name}
										{hints.has(recipe.publicId) ? (
											<span className={styles.hint}>
												{" ・ "}
												{hints.get(recipe.publicId)}
											</span>
										) : null}
									</span>
									<Icon name="chevron-right" size={20} />
								</button>
							</li>
						))}
					</ul>
				) : null}
				{refreshButton}
			</>
		);
	}

	return (
		<>
			<Field label="ユーザーを探す" hideLabel>
				{(control) => (
					<TextInput
						{...control}
						ref={searchRef}
						placeholder="表示名か、ハンドルで探す"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={onKeyDown}
					/>
				)}
			</Field>
			{users === null ? (
				<Note tone="info" spinning>
					読み込んでいます…
				</Note>
			) : null}
			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
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
								<span className={styles.itemText}>
									{user.name}（@{user.handle}）
								</span>
								<Icon name="chevron-right" size={20} />
							</button>
						</li>
					))}
				</ul>
			) : null}
			{refreshButton}
		</>
	);
}
