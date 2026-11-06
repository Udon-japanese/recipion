import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { TextInput } from "#/components/field/field";
import { IconButton } from "#/components/icon-button/icon-button";
import { Note } from "#/components/note/note";
import { Tag } from "#/components/tag/tag";
import { Toggle } from "#/components/toggle/toggle";
import { describeError } from "#/errors/user-facing-error";
import * as settingsStyles from "#/features/settings/components/settings-page.css";
import type { IngredientDictionaryCommand } from "../application/manage-ingredient-dictionary";
import { foldIngredientSearchText } from "../domain/ingredient-catalog";
import {
	createIngredientDictionary,
	describeIngredientNameProblem,
	findAliasProblem,
	findIngredientNameProblem,
	type IngredientDictionary,
	type IngredientDictionaryEntry,
	listUserAliases,
} from "../domain/ingredient-dictionary";
import * as styles from "./ingredient-dictionary-section.css";

type IngredientDictionarySectionProps = {
	loadEntries: () => Promise<IngredientDictionaryEntry[]>;
	runCommand: (command: IngredientDictionaryCommand) => Promise<void>;
};

// 書き込みを送り、読み直す。失敗したら、文を返す（成功なら null）。
type Run = (command: IngredientDictionaryCommand) => Promise<string | null>;

// 設定の「材料」：自分の材料（在庫に登録したもの・ここで足したもの）と、その呼び名。
// 呼び名を足すと、レシピ・在庫・買い物メモで、同じ材料として扱う（本文やメモの文字は変えない）。
export function IngredientDictionarySection({
	loadEntries,
	runCommand,
}: IngredientDictionarySectionProps) {
	const [entries, setEntries] = useState<IngredientDictionaryEntry[] | null>(
		null,
	);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [openId, setOpenId] = useState<string | null>(null);

	const reload = useCallback(async () => {
		try {
			setEntries(await loadEntries());
			setLoadError(null);
		} catch (error) {
			setLoadError(describeError(error, "材料を読み込めませんでした"));
		}
	}, [loadEntries]);

	useEffect(() => {
		void reload();
	}, [reload]);

	const run: Run = async (command) => {
		try {
			await runCommand(command);
			await reload();

			return null;
		} catch (error) {
			return describeError(
				error,
				"保存できませんでした。通信を確認してください",
			);
		}
	};

	const dictionary = createIngredientDictionary(entries ?? []);
	const folded = foldIngredientSearchText(query);
	const shown = (entries ?? []).filter(
		(entry) =>
			folded === "" ||
			[entry.name, ...entry.aliases].some((name) =>
				foldIngredientSearchText(name).includes(folded),
			),
	);

	return (
		<section
			className={settingsStyles.section}
			aria-labelledby="settings-ingredients"
		>
			<div className={settingsStyles.sectionHead}>
				<h2 className={settingsStyles.sectionTitle} id="settings-ingredients">
					材料
				</h2>
			</div>
			<p className={settingsStyles.sectionNote}>
				在庫に登録した材料と、ここで足した材料です。呼び名（「とりむね」など）を足すと、レシピ・在庫・買い物メモで、同じ材料として扱います。
			</p>

			<AddIngredientForm dictionary={dictionary} run={run} />

			{loadError ? <Note tone="error">{loadError}</Note> : null}

			{entries === null ? null : entries.length === 0 ? (
				<p className={settingsStyles.sectionNote}>まだ材料はありません。</p>
			) : (
				<>
					<TextInput
						type="search"
						aria-label="材料を探す"
						placeholder="材料を探す"
						autoComplete="off"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					{shown.length === 0 ? (
						<p className={settingsStyles.sectionNote}>見つかりませんでした。</p>
					) : (
						<ul className={styles.list} aria-label="自分の材料">
							{shown.map((entry) => (
								<IngredientRow
									key={entry.id}
									entry={entry}
									dictionary={dictionary}
									isOpen={openId === entry.id}
									onToggle={() =>
										setOpenId((current) =>
											current === entry.id ? null : entry.id,
										)
									}
									run={run}
								/>
							))}
						</ul>
					)}
				</>
			)}
		</section>
	);
}

// 名前と、追加のボタンが1組になった入力（材料の追加・呼び名の追加・名前の変更で使う）。
function NameForm({
	label,
	buttonLabel,
	initialValue = "",
	successLabel,
	check,
	submit,
}: {
	label: string;
	buttonLabel: string;
	initialValue?: string;
	successLabel: string;
	// 送る前に確かめる（問題があれば、その文）。
	check: (value: string) => string | null;
	// 送る（失敗したら、その文）。
	submit: (value: string) => Promise<string | null>;
}): ReactNode {
	const [value, setValue] = useState(initialValue);
	const [message, setMessage] = useState<string | null>(null);
	const action = useButtonAction();

	async function handleSubmit() {
		const problem = check(value);

		if (problem) {
			setMessage(problem);

			return;
		}

		await action.run(async () => {
			const failure = await submit(value);

			setMessage(failure);

			if (failure) {
				return false;
			}

			if (initialValue === "") {
				setValue("");
			}
		});
	}

	return (
		<form
			className={styles.nameForm}
			onSubmit={(event) => {
				event.preventDefault();
				void handleSubmit();
			}}
		>
			<div className={styles.nameRow}>
				<TextInput
					aria-label={label}
					placeholder={label}
					autoComplete="off"
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
						setMessage(null);
					}}
				/>
				<Button
					type="submit"
					variant="secondary"
					status={action.status}
					successLabel={successLabel}
					disabled={value.trim() === ""}
				>
					{buttonLabel}
				</Button>
			</div>
			{message ? (
				<p className={styles.message} role="alert">
					{message}
				</p>
			) : null}
		</form>
	);
}

function AddIngredientForm({
	dictionary,
	run,
}: {
	dictionary: IngredientDictionary;
	run: Run;
}) {
	return (
		<NameForm
			label="新しい材料の名前"
			buttonLabel="足す"
			successLabel="足しました"
			check={(value) => {
				const problem = findIngredientNameProblem(dictionary, value);

				return problem ? describeIngredientNameProblem(problem) : null;
			}}
			submit={(name) => run({ kind: "create", name })}
		/>
	);
}

function IngredientRow({
	entry,
	dictionary,
	isOpen,
	onToggle,
	run,
}: {
	entry: IngredientDictionaryEntry;
	dictionary: IngredientDictionary;
	isOpen: boolean;
	onToggle: () => void;
	run: Run;
}) {
	const userAliases = listUserAliases(entry);
	const [removeError, setRemoveError] = useState<string | null>(null);
	const removeAction = useButtonAction();
	const editorId = `ingredient-editor-${entry.id}`;

	return (
		<li className={styles.row}>
			<div className={styles.rowHead}>
				<span className={styles.name}>{entry.name}</span>
				{entry.hasInventory ? <Tag>在庫あり</Tag> : null}
				{entry.unmanaged ? <Tag>管理しない</Tag> : null}
				<span className={styles.aliases}>
					{userAliases.length > 0 ? userAliases.join("・") : null}
				</span>
				<IconButton
					icon="edit"
					label={`${entry.name}を直す`}
					aria-expanded={isOpen}
					aria-controls={editorId}
					onClick={onToggle}
				/>
			</div>

			{isOpen ? (
				<div className={styles.editor} id={editorId}>
					<NameForm
						label={`${entry.name}の名前`}
						buttonLabel="名前を変える"
						initialValue={entry.name}
						successLabel="変えました"
						check={(value) => {
							const problem = findIngredientNameProblem(
								dictionary,
								value,
								entry,
								{
									allowOwnName: true,
								},
							);

							return problem ? describeIngredientNameProblem(problem) : null;
						}}
						submit={(name) =>
							run({ kind: "rename", ingredientId: entry.id, name })
						}
					/>

					<UnmanagedSetting entry={entry} run={run} />

					<div className={styles.aliasBlock}>
						<p className={styles.aliasTitle}>呼び名</p>
						{userAliases.length === 0 ? (
							<p className={settingsStyles.sectionNote}>まだありません。</p>
						) : (
							<ul
								className={styles.aliasList}
								aria-label={`${entry.name}の呼び名`}
							>
								{userAliases.map((alias) => (
									<li className={styles.alias} key={alias}>
										{alias}
										<IconButton
											icon="close"
											label={`呼び名「${alias}」を消す`}
											onClick={() =>
												void run({
													kind: "remove-alias",
													ingredientId: entry.id,
													alias,
												}).then(setRemoveError)
											}
										/>
									</li>
								))}
							</ul>
						)}
						<NameForm
							label={`${entry.name}の呼び名を足す`}
							buttonLabel="呼び名を足す"
							successLabel="足しました"
							check={(value) => {
								const problem = findAliasProblem(dictionary, entry, value);

								return problem ? describeIngredientNameProblem(problem) : null;
							}}
							submit={(alias) =>
								run({ kind: "add-alias", ingredientId: entry.id, alias })
							}
						/>
					</div>

					<div>
						<Button
							variant="danger"
							status={removeAction.status}
							disabledReason="在庫にあるため消せません。先に在庫から消してください"
							disabled={entry.hasInventory}
							onClick={() =>
								void removeAction.run(async () => {
									const failure = await run({
										kind: "remove",
										ingredientId: entry.id,
									});

									setRemoveError(failure);

									return failure === null;
								})
							}
						>
							{entry.name}を消す
						</Button>
					</div>
					{removeError ? (
						<p className={styles.message} role="alert">
							{removeError}
						</p>
					) : null}
				</div>
			) : null}
		</li>
	);
}

// 「管理しない」の切り替え。在庫のある材料は、在庫で数えているので、切り替えられない。
function UnmanagedSetting({
	entry,
	run,
}: {
	entry: IngredientDictionaryEntry;
	run: Run;
}) {
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	async function change(unmanaged: boolean) {
		setIsSaving(true);
		setMessage(
			await run({ kind: "set-unmanaged", ingredientId: entry.id, unmanaged }),
		);
		setIsSaving(false);
	}

	return (
		<div className={styles.unmanaged}>
			<div className={styles.unmanagedRow}>
				<span>
					<span className={styles.aliasTitle}>管理しない</span>
					<span className={styles.unmanagedNote}>
						{entry.hasInventory
							? "在庫にあるため、切り替えられません"
							: "レシピから買い物メモに入れる候補にせず、「つくった」で引きません"}
					</span>
				</span>
				<Toggle
					label={`${entry.name}を管理しない`}
					checked={entry.unmanaged}
					disabled={entry.hasInventory || isSaving}
					onChange={(checked) => void change(checked)}
				/>
			</div>
			{message ? (
				<p className={styles.message} role="alert">
					{message}
				</p>
			) : null}
		</div>
	);
}
