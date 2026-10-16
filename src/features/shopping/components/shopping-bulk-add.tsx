import {
	type KeyboardEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import { Field, TextArea } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import { ShortcutKeys } from "#/features/shortcuts/components/shortcut-keys";
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
	// 補完：カーソルの位置と、選んでいる候補。変換中は、キー操作を横取りしない（候補のクリックだけ使える）。
	const [caret, setCaret] = useState(0);
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
	const isRight = useMediaQuery("(min-width: 1024px)");
	const lines = useMemo(() => parseShoppingMemo(text, stores), [text, stores]);
	const completion = useMemo(() => {
		const found = getShoppingMemoCompletion(text, caret, stores);

		return found && !(closedAt?.text === text && closedAt.caret === caret)
			? found
			: null;
	}, [text, caret, stores, closedAt]);
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

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中は、IME に任せる。
		if (!completion || event.nativeEvent.isComposing) {
			return;
		}

		const count = completion.items.length;

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((current) => {
				if (event.key === "ArrowDown") {
					return current === null ? 0 : (current + 1) % count;
				}

				return current === null ? count - 1 : (current - 1 + count) % count;
			});
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

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			title={title}
			placement={isRight ? "right" : "bottom"}
			snapPoints={isRight ? [0.92] : [0.7, 0.92]}
			footer={
				<Button
					fullWidth
					status={addAction.status}
					pendingLabel="追加しています"
					disabled={lines.length === 0}
					disabledReason="買うものを書いてください"
					onClick={() => void addAction.run(add)}
				>
					{lines.length}件を追加
				</Button>
			}
		>
			<div className={styles.bulkBody}>
				<Field
					label="買うもの（1行に1つ）"
					hint="「卵 10個」「牛乳 2」のように書けます。数字だけなら「個」、数量を書かなければ1つになります。店の名前だけの行から下は、その店になり、「卵 @イオン」のように、行ごとにも店を指定できます。"
				>
					{(control) => (
						<TextArea
							{...control}
							rows={6}
							placeholder={
								"イオン\n卵 10個\n牛乳 2\n\n豚こま 300g @業務スーパー"
							}
							ref={textareaRef}
							value={text}
							onChange={(event) => {
								setText(event.target.value);
								setCaret(event.target.selectionStart);
								setActiveIndex(null);
							}}
							onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
							onKeyDown={handleKeyDown}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
						/>
					)}
				</Field>

				<CompletionMenu
					textareaRef={textareaRef}
					layout={layout}
					open={isFocused && completion !== null}
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
					onAccept={acceptCompletion}
					hint={
						<>
							<ShortcutKeys keys={["up-down"]} />
							で選び、
							<ShortcutKeys keys={["tab"]} />
							で決定（
							<ShortcutKeys keys={["esc"]} />
							で閉じる）
						</>
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
				) : null}

				{errorMessage ? (
					<p className={styles.bulkError} role="alert">
						{errorMessage}
					</p>
				) : null}
			</div>
		</Sheet>
	);
}
