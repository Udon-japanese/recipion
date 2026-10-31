import {
	type KeyboardEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { CompletionHint } from "#/components/completion-menu/completion-hint";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import { Modal } from "#/components/dialog/modal";
import { Field, TextArea } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import { editKindOfInput } from "#/ime/text-history";
import {
	type CaretSnapshot,
	type CommitContext,
	useCompositionCompletion,
} from "#/ime/use-composition-completion";
import { useTextHistory } from "#/ime/use-text-history";
import {
	applyShoppingMemoCompletion,
	getShoppingMemoCompletion,
	type ShoppingMemoCompletion,
} from "../domain/get-shopping-memo-completion";
import {
	type ParsedShoppingMemoLine,
	parseShoppingMemo,
} from "../domain/parse-shopping-memo";
import {
	applyConversionDefaults,
	type ShoppingConversionDefaults,
} from "../domain/shopping-conversion-default";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-page.css";

type ShoppingBulkAddProps = {
	// シートの見出し（省略すると、「まとめて追加」）。条件つきのメモの側に入れるときは、その側の名前を添える。
	title?: string;
	stores: readonly ShoppingStore[];
	// 食材ごとの、在庫換算の記憶。数量のない行に、記憶の単位を補う。
	conversionDefaults?: ShoppingConversionDefaults;
	onClose: () => void;
	// 読み取った行を、一覧に追加する。追加できた件数を返す（途中で失敗したら、そこまで）。
	onAdd: (lines: readonly ParsedShoppingMemoLine[]) => Promise<number>;
	// 登録のない店を、店として追加する（成功したら、その店）。追加すると、その店の項目として読み直される。
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

const noConversionDefaults: ShoppingConversionDefaults = {};

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
	conversionDefaults = noConversionDefaults,
	onClose,
	onAdd,
	onCreateStore,
}: ShoppingBulkAddProps) {
	const [text, setText] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// 補完：カーソルの位置と、選んでいる候補。
	const [caret, setCaret] = useState(0);
	const keepBlurredRef = useRef(false);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [closedAt, setClosedAt] = useState<{
		text: string;
		caret: number;
	} | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const layout = useCompletionLayout();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	// 変換中（IME）の補完。レシピの本文と共通。
	const composing = useCompositionCompletion<ShoppingMemoCompletion>({
		textareaRef,
		apply: applyDuringComposition,
		onCompositionEnd: ({ before, after }) =>
			history.record(before, after, "other"),
	});
	// 元に戻す・やり直しの履歴（自前。レシピの本文と共通）。補完で本文を書き換えると、ブラウザの履歴は使えなくなるため。
	const history = useTextHistory({ textareaRef, restore: write });
	const pendingCaretRef = useRef<number | null>(null);
	const addAction = useButtonAction();
	// 広い画面（PC）は、幅広のモーダル。狭い画面は、ボトムシートに、タブで切り替える。
	const isWide = useMediaQuery("(min-width: 768px)");
	const [tab, setTab] = useState<"input" | "preview">("input");
	const lines = useMemo(
		() =>
			applyConversionDefaults(
				parseShoppingMemo(text, stores),
				conversionDefaults,
			),
		[text, stores, conversionDefaults],
	);
	const completion = useMemo(() => {
		// 変換中（未確定）は、入力と完全に一致する候補も出す。確定したあとは、確定済みとみなして出さない。
		const found = getShoppingMemoCompletion(text, caret, stores, {
			includeExact: composing.isComposing,
		});

		return found && !(closedAt?.text === text && closedAt.caret === caret)
			? found
			: null;
	}, [text, caret, stores, closedAt, composing.isComposing]);
	// 変換中に補完できない環境（iPhone・Firefox など）は、確定したあとに出す。
	const isMenuOpen =
		isFocused && completion !== null && composing.canCompleteWhileComposing;
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

			// 変換を確定させるために外したフォーカスは、ここでは戻さない（IME の処理の最中に戻すと、変換中の文字が、後ろに残る）。あとで戻す（restoreFocus）。
			if (!keepBlurredRef.current) {
				textareaRef.current.focus();
			}

			keepBlurredRef.current = false;
			pendingCaretRef.current = null;
		}
	}, [text]);

	// 本文を書き換えて、カーソルを置く。
	function write(next: CaretSnapshot) {
		pendingCaretRef.current = next.caret;
		setText(next.text);
		setCaret(next.caret);
		setActiveIndex(null);
	}

	function acceptCompletion(index: number) {
		if (!completion) {
			return;
		}

		const applied = applyShoppingMemoCompletion(text, completion, index);

		history.record(
			{ text, caret: textareaRef.current?.selectionStart ?? caret },
			applied,
			"other",
		);
		write(applied);
	}

	// 変換中に決めた候補で、本文を書き換える（変換の中身の扱いは、useCompositionCompletion）。
	function applyDuringComposition(
		found: ShoppingMemoCompletion,
		index: number,
		{ composition, source, committed, shouldEnd }: CommitContext,
	): CaretSnapshot {
		// 変換で本文の長さが変わった分だけ、置き換える範囲の終わりをずらす。
		const applied = applyShoppingMemoCompletion(
			committed.text,
			{ ...found, to: found.to + committed.text.length - source.text.length },
			index,
		);

		// 変換中の文字（「とま」）の段階を、履歴に残す。変換中のまま置き換える方式では、候補を計算したときの本文を使う。
		const middle = shouldEnd ? committed : source;

		history.record(composition.before, middle, "other");
		history.record(middle, applied, "other");
		// 確定のために外したフォーカスは、ここでは戻さない（IME の処理の最中に戻すと、変換中の文字が、後ろに残る）。あとで戻す。
		keepBlurredRef.current = shouldEnd;
		write(applied);

		return applied;
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
		// 変換中は、IME に任せる。ただし、候補が出ているときは、Tab と Alt+↑↓ を、補完に使う。
		if (
			composing.handleKeyDown(event, {
				shown:
					isMenuOpen && completion
						? {
								completion,
								count: completion.items.length,
								text,
								caret,
							}
						: null,
				activeIndex,
				moveActive,
			})
		) {
			return;
		}

		// 元に戻す・やり直す（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y）は、自前の履歴で行う。
		if (history.handleKeyDown(event)) {
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
							// 変換中の入力は、変換が終わったときに、まとめて記録する。
							if (
								!composing.noteChange(
									isMenuOpen && completion
										? {
												completion,
												count: completion.items.length,
												text,
												caret,
											}
										: null,
								)
							) {
								history.record(
									{ text, caret },
									{
										text: event.target.value,
										caret: event.target.selectionStart,
									},
									editKindOfInput((event.nativeEvent as InputEvent).inputType),
								);
							}

							setText(event.target.value);
							setCaret(composing.readCaret(event.target));
							setActiveIndex(null);
						}}
						onSelect={(event) =>
							setCaret(composing.readCaret(event.currentTarget))
						}
						onKeyDown={handleKeyDown}
						onCompositionStart={composing.onCompositionStart}
						onCompositionEnd={composing.onCompositionEnd}
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
				prefer={composing.prefersAbove(text, caret) ? "above" : "below"}
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
					completion && composing.isActive()
						? void composing.accept(completion, index, { text, caret })
						: acceptCompletion(index)
				}
				hint={<CompletionHint isComposing={composing.isComposing} />}
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
