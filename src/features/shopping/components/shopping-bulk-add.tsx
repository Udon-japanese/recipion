import {
	type CompositionEvent,
	type KeyboardEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import { Modal } from "#/components/dialog/modal";
import { Field, TextArea } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import { ShortcutKeys } from "#/features/shortcuts/components/shortcut-keys";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "#/ime/choose-composition-strategy";
import { endComposition, restoreFocus } from "#/ime/end-composition";
import { readBrowserEnvironment } from "#/ime/read-browser-environment";
import {
	applyShoppingMemoCompletion,
	getShoppingMemoCompletion,
} from "../domain/get-shopping-memo-completion";
import {
	type ParsedShoppingMemoLine,
	parseShoppingMemo,
} from "../domain/parse-shopping-memo";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-page.css";

type ShoppingBulkAddProps = {
	// シートの見出し（省略すると、「まとめて追加」）。条件つきのメモの側に入れるときは、その側の名前を添える。
	title?: string;
	stores: readonly ShoppingStore[];
	onClose: () => void;
	// 読み取った行を、一覧に追加する。追加できた件数を返す（途中で失敗したら、そこまで）。
	onAdd: (lines: readonly ParsedShoppingMemoLine[]) => Promise<number>;
	// 登録のない店を、店として追加する（成功したら、その店）。追加すると、その店の項目として読み直される。
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

function formatQuantity(line: ParsedShoppingMemoLine): string | null {
	if (line.unitLabel === null && line.quantity === 1) {
		return null;
	}

	return `${line.quantity}${line.unitLabel ?? ""}`;
}

// 買い物のメモを、1行に1つずつ書いて（貼り付けて）、読み取った結果を確認してから、まとめて一覧に追加する。
// 書いた文章は、追加したあと、一覧とは結びつかない（一覧が正）。
export function ShoppingBulkAdd({
	title = "まとめて追加",
	stores,
	onClose,
	onAdd,
	onCreateStore,
}: ShoppingBulkAddProps) {
	const [text, setText] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// 補完：カーソルの位置と、選んでいる候補。
	const [caret, setCaret] = useState(0);
	// IME の変換中か（変換中の補完の扱いは、レシピのエディタと同じ。環境ごとに決まる）。
	const [isComposing, setIsComposing] = useState(false);
	const composingRef = useRef(false);
	const isAcceptingRef = useRef(false);
	const [strategy, setStrategy] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);
	// 変換の確定のあと、本文とカーソルが動くまでは、メニューを、カーソルの上に置いたままにする（直後のクリックが、移った先に当たらないように）。
	const [aboveUntilChange, setAboveUntilChange] = useState<{
		text: string;
		caret: number;
	} | null>(null);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [closedAt, setClosedAt] = useState<{
		text: string;
		caret: number;
	} | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const layout = useCompletionLayout();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const pendingCaretRef = useRef<number | null>(null);
	const addAction = useButtonAction();
	// 広い画面（PC）は、幅広のモーダル。狭い画面は、ボトムシートに、タブで切り替える。
	const isWide = useMediaQuery("(min-width: 768px)");
	const [tab, setTab] = useState<"input" | "preview">("input");
	const lines = useMemo(() => parseShoppingMemo(text, stores), [text, stores]);
	const completion = useMemo(() => {
		const found = getShoppingMemoCompletion(text, caret, stores);

		return found && !(closedAt?.text === text && closedAt.caret === caret)
			? found
			: null;
	}, [text, caret, stores, closedAt]);
	// 変換中に補完できない環境（iPhone・Firefox など）は、確定したあとに出す。
	const isMenuOpen =
		isFocused &&
		completion !== null &&
		(!isComposing || strategy !== "wait-for-confirmation");
	const keepAbove =
		aboveUntilChange?.text === text && aboveUntilChange.caret === caret;

	useEffect(() => {
		setStrategy(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);
	// 登録のない店の名前（同じ名前は、1つにまとめる）。
	const unknownStoreNames = [
		...new Set(
			lines.flatMap((line) =>
				line.unknownStoreName ? [line.unknownStoreName] : [],
			),
		),
	];
	const storeNames = new Map(stores.map((store) => [store.id, store.name]));

	// 置き換えたあと、カーソルを、候補の後ろへ動かす。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 本文が替わったとき（置き換えの直後）に、実行する。
	useLayoutEffect(() => {
		const pending = pendingCaretRef.current;

		if (pending !== null && textareaRef.current) {
			textareaRef.current.setSelectionRange(pending, pending);
			textareaRef.current.focus();
			pendingCaretRef.current = null;
		}
	}, [text]);

	// Safari は、変換中の文字の範囲全体を選択状態にする。そのときのカーソルは、範囲の末尾。
	function readCaret(textarea: HTMLTextAreaElement) {
		return composingRef.current
			? textarea.selectionEnd
			: textarea.selectionStart;
	}

	function acceptCompletion(index: number) {
		if (!completion) {
			return;
		}

		const applied = applyShoppingMemoCompletion(text, completion, index);

		pendingCaretRef.current = applied.caret;
		setText(applied.text);
		setCaret(applied.caret);
		setActiveIndex(null);
	}

	// 変換中に候補を決める。Chromium 系は、変換を確定させてから、確定した文字を含めて置き換える。Safari・Android は、変換中のまま書き換える。
	async function acceptDuringComposition(index: number) {
		const textarea = textareaRef.current;

		if (!textarea || !completion || isAcceptingRef.current) {
			return;
		}

		isAcceptingRef.current = true;

		const shouldEnd = strategy === "end-then-replace";

		if (shouldEnd) {
			await endComposition(textarea);
		}

		// 変換で本文の長さが変わっているので、置き換える範囲の終わりは、今のカーソルにする。
		const applied = applyShoppingMemoCompletion(
			textarea.value,
			{ ...completion, to: textarea.selectionEnd },
			index,
		);

		composingRef.current = false;
		isAcceptingRef.current = false;
		setIsComposing(false);
		pendingCaretRef.current = applied.caret;
		setText(applied.text);
		setCaret(applied.caret);
		setActiveIndex(null);

		if (shouldEnd) {
			restoreFocus(textarea, applied.caret);
		}
	}

	function handleCompositionStart() {
		composingRef.current = true;
		setIsComposing(true);
	}

	function handleCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
		// 候補を決める処理が、すでに扱っているときは、ここでは何もしない。
		if (!composingRef.current || isAcceptingRef.current) {
			return;
		}

		composingRef.current = false;
		setIsComposing(false);
		setAboveUntilChange({
			text: event.currentTarget.value,
			caret: event.currentTarget.selectionStart,
		});
	}

	// 候補の選択を1つ動かす（端までいくと、反対側へ回る）。
	function moveActive(direction: "up" | "down") {
		const count = completion?.items.length ?? 0;

		if (count === 0) {
			return;
		}

		setActiveIndex((current) => {
			if (direction === "down") {
				return current === null ? 0 : (current + 1) % count;
			}

			return current === null ? count - 1 : (current - 1 + count) % count;
		});
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中は、IME に任せる。ただし、候補が出ているときは、Tab（決定）と Alt（Option）+↑↓（選択）を、補完に使う。
		// 素の矢印と Enter は、IME が使う（Enter は変換の確定）。
		if (event.nativeEvent.isComposing) {
			if (!completion || strategy === "wait-for-confirmation") {
				return;
			}

			if (
				event.altKey &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.shiftKey &&
				(event.key === "ArrowDown" || event.key === "ArrowUp")
			) {
				event.preventDefault();
				moveActive(event.key === "ArrowDown" ? "down" : "up");
			} else if (event.code === "Tab" && !event.shiftKey) {
				event.preventDefault();
				void acceptDuringComposition(activeIndex ?? 0);
			}

			return;
		}

		if (!completion) {
			return;
		}

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			moveActive(event.key === "ArrowDown" ? "down" : "up");
		} else if (event.key === "Tab") {
			event.preventDefault();
			acceptCompletion(activeIndex ?? 0);
		} else if (event.key === "Escape") {
			// シートごと閉じないよう、ここで止めて、候補だけ閉じる。
			event.preventDefault();
			event.stopPropagation();
			setClosedAt({ text, caret });
		}
	}

	async function createStore(name: string) {
		setErrorMessage(null);

		const created = await onCreateStore(name);

		if (!created) {
			setErrorMessage(
				`「${name}」を店に追加できませんでした（店は20件まで、名前は30文字までです）。`,
			);
		}
	}

	async function add() {
		setErrorMessage(null);

		const added = await onAdd(lines);

		if (added < lines.length) {
			setErrorMessage(
				`${added}件を追加したところで、止まりました。残りは、もう一度、追加してください。`,
			);

			return false;
		}

		onClose();

		return true;
	}

	const inputPane = (
		<div className={styles.bulkPane}>
			<Field
				label="買うもの（1行に1つ）"
				hint="「卵 10個」「牛乳 2」のように書けます。数字だけなら「個」、数量を書かなければ1つになります。店の名前だけの行から下は、その店になり、「卵 @イオン」のように、行ごとにも店を指定できます。"
			>
				{(control) => (
					<TextArea
						{...control}
						data-autofocus=""
						rows={isWide ? 14 : 8}
						placeholder={"イオン\n卵 10個\n牛乳 2\n\n豚こま 300g @業務スーパー"}
						ref={textareaRef}
						value={text}
						onChange={(event) => {
							setText(event.target.value);
							setCaret(readCaret(event.target));
							setActiveIndex(null);
						}}
						onSelect={(event) => setCaret(readCaret(event.currentTarget))}
						onKeyDown={handleKeyDown}
						onCompositionStart={handleCompositionStart}
						onCompositionEnd={handleCompositionEnd}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
					/>
				)}
			</Field>

			<CompletionMenu
				textareaRef={textareaRef}
				layout={layout}
				open={isMenuOpen}
				// 変換中・確定の直後は、IME の窓（文字の下に出る）を避けて、カーソルの上に出す。
				prefer={isComposing || keepAbove ? "above" : "below"}
				caret={caret}
				items={
					completion
						? completion.items.map((item) => ({
								key: `${item.kind}-${item.label}`,
								label: item.label,
								badge: item.kind === "store" ? "店" : undefined,
							}))
						: null
				}
				activeIndex={activeIndex}
				onAccept={(index) =>
					composingRef.current
						? void acceptDuringComposition(index)
						: acceptCompletion(index)
				}
				hint={
					isComposing ? (
						<>
							<ShortcutKeys keys={["alt", "up-down"]} />
							で選び、
							<ShortcutKeys keys={["tab"]} />
							で決定
						</>
					) : (
						<>
							<ShortcutKeys keys={["up-down"]} />
							で選び、
							<ShortcutKeys keys={["tab"]} />
							で決定（
							<ShortcutKeys keys={["esc"]} />
							で閉じる）
						</>
					)
				}
			/>

			{unknownStoreNames.length > 0 ? (
				<div className={styles.bulkNewStores}>
					<p className={styles.bulkNewStoresText}>
						登録のない店があります。店に追加すると、その店の項目になります。
					</p>
					<div className={styles.bulkNewStoreButtons}>
						{unknownStoreNames.map((name) => (
							<Button
								key={name}
								variant="secondary"
								size="sm"
								leadingIcon={<Icon name="plus" size={20} />}
								onClick={() => void createStore(name)}
							>
								「{name}」を店に追加
							</Button>
						))}
					</div>
				</div>
			) : null}
		</div>
	);

	const previewPane = (
		<div className={styles.bulkPane}>
			{isWide ? <p className={styles.bulkPaneTitle}>読み取った内容</p> : null}

			{lines.length > 0 ? (
				<ul className={styles.bulkList} aria-label="読み取った内容">
					{lines.map((line, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: 書いた文章から作る確認用の一覧で、並びは行の順のまま。
						<li className={styles.bulkRow} key={index}>
							<span className={styles.bulkName}>{line.name}</span>
							{formatQuantity(line) ? (
								<span className={styles.bulkQuantity}>
									{formatQuantity(line)}
								</span>
							) : null}
							{line.storeId ? (
								<Tag icon="store" tone="soft">
									{storeNames.get(line.storeId)}
								</Tag>
							) : null}
							{line.unknownStoreName ? (
								<Tag tone="warn">
									「{line.unknownStoreName}」は、登録のない店です
								</Tag>
							) : null}
						</li>
					))}
				</ul>
			) : (
				<p className={styles.bulkEmpty}>
					書いた内容が、ここに、読み取った結果として出ます。
				</p>
			)}
		</div>
	);

	const error = errorMessage ? (
		<p className={styles.bulkError} role="alert">
			{errorMessage}
		</p>
	) : null;
	const footer = (
		<Button
			fullWidth={!isWide}
			status={addAction.status}
			pendingLabel="追加しています"
			disabled={lines.length === 0}
			disabledReason="買うものを書いてください"
			onClick={() => void addAction.run(add)}
		>
			{lines.length}件を追加
		</Button>
	);

	// PC：幅広のモーダルに、入力（左）と確認（右）を並べる。
	if (isWide) {
		return (
			<Modal
				open
				onOpenChange={(open) => {
					if (!open) {
						onClose();
					}
				}}
				title={title}
				footer={footer}
			>
				<div className={styles.bulkColumns}>
					{inputPane}
					{previewPane}
				</div>
				{error}
			</Modal>
		);
	}

	// スマホ：ボトムシートに、「入力」と「確認」のタブ（レシピエディタと同じ切り替え）。
	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			title={title}
			placement="bottom"
			snapPoints={[0.92]}
			footer={footer}
		>
			<div className={styles.bulkBody}>
				<SegmentedControl<"input" | "preview">
					label="表示の切り替え"
					value={tab}
					onChange={setTab}
					options={[
						{ value: "input", label: "入力" },
						{ value: "preview", label: `確認 ${lines.length}` },
					]}
				/>

				{tab === "input" ? inputPane : previewPane}
				{error}
			</div>
		</Sheet>
	);
}
