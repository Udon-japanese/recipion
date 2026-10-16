import { useMemo, useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Field, TextArea } from "#/components/field/field";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { useMediaQuery } from "#/components/use-media-query";
import {
	type ParsedShoppingMemoLine,
	parseShoppingMemo,
} from "../domain/parse-shopping-memo";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-page.css";

type ShoppingBulkAddProps = {
	stores: readonly ShoppingStore[];
	onClose: () => void;
	// 読み取った行を、一覧に追加する。追加できた件数を返す（途中で失敗したら、そこまで）。
	onAdd: (lines: readonly ParsedShoppingMemoLine[]) => Promise<number>;
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
	stores,
	onClose,
	onAdd,
}: ShoppingBulkAddProps) {
	const [text, setText] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const addAction = useButtonAction();
	const isRight = useMediaQuery("(min-width: 1024px)");
	const lines = useMemo(() => parseShoppingMemo(text, stores), [text, stores]);
	const storeNames = new Map(stores.map((store) => [store.id, store.name]));

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
			title="まとめて追加"
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
					hint="「卵 10個」「牛乳 2」のように書けます。数字だけなら「個」になります。店の名前だけの行から下は、その店になり、「卵 @イオン」のように、行ごとにも店を指定できます。"
				>
					{(control) => (
						<TextArea
							{...control}
							rows={6}
							placeholder={
								"イオン\n卵 10個\n牛乳 2\n\n豚こま 300g @業務スーパー"
							}
							value={text}
							onChange={(event) => setText(event.target.value)}
						/>
					)}
				</Field>

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
