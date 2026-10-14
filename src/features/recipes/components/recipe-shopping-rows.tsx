import { Fragment } from "react";
import { Button } from "#/components/button/button";
import { Checkbox } from "#/components/checkbox/checkbox";
import { Icon } from "#/components/icon/icon";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import type {
	DuplicateMode,
	RecipeShoppingRow,
} from "../domain/plan-shopping-from-recipe";
import * as styles from "./recipe-shopping-rows.css";
import type { useRecipeShoppingPlan } from "./use-recipe-shopping-plan";

const duplicateModeOptions: readonly { value: DuplicateMode; label: string }[] =
	[
		{ value: "max", label: "多い方に合わせる" },
		{ value: "sum", label: "合算する" },
		{ value: "skip", label: "追加しない" },
	];

function describeStock(row: RecipeShoppingRow): {
	text: string;
	isShort: boolean;
} {
	const base = describeStockBase(row);

	// 形が決まっている代わりの食材（冷凍玉ねぎ(みじん切り)など）は、足りているとは判定せず、在庫があることだけ知らせる。
	const names =
		row.stock.kind === "judged" ? row.stock.fixedShapeStandInNames : undefined;

	return names && names.length > 0
		? { ...base, text: `${base.text}（${names.join("、")}の在庫があります）` }
		: base;
}

function describeStockBase(row: RecipeShoppingRow): {
	text: string;
	isShort: boolean;
} {
	if (row.stock.kind === "unknown") {
		return { text: "在庫の情報なし", isShort: true };
	}

	const { judgment } = row.stock;

	if (row.stock.standInName) {
		return {
			text: `${row.stock.standInName}の在庫で足りています`,
			isShort: false,
		};
	}

	if (judgment.status === "enough") {
		return {
			text:
				judgment.basis === "presence" ? "足りている（在庫あり）" : "足りている",
			isShort: false,
		};
	}

	if (judgment.shortage !== null) {
		return {
			text: `あと ${formatQuantityForUnit(judgment.shortage, row.amount.unitLabel)}${row.amount.unitLabel ?? ""}`,
			isShort: true,
		};
	}

	return {
		text: judgment.isRegistered ? "在庫が0" : "在庫なし",
		isShort: true,
	};
}

function describeExisting(row: RecipeShoppingRow): string | null {
	if (!row.existing) {
		return null;
	}

	const current = `${formatQuantityForUnit(row.existing.quantity, row.existing.unitLabel)}${row.existing.unitLabel ?? ""}`;

	if (row.plan === "update") {
		return `メモに「${row.existing.name} ${current}」あり → ${formatQuantityForUnit(row.nextQuantity, row.existing.unitLabel)}${row.existing.unitLabel ?? ""}に更新`;
	}

	const label = `メモに「${row.existing.name} ${current}」あり`;

	// 変更しない理由を示す（チェックできない理由が、分かるように）。
	switch (row.keepReason) {
		case "already-enough":
			return `${label}（メモの数量で足りているため、変更なし）`;
		case "skip-mode":
			return `${label}（「追加しない」の設定のため、そのまま）`;
		case "incomparable-unit":
			return `${label}（単位が違うため、そのまま）`;
		default:
			return label;
	}
}

type RecipeShoppingRowsProps = {
	plan: ReturnType<typeof useRecipeShoppingPlan>;
	ownerScope: string | null;
	// 「ある」を押したとき、その食材を、在庫に「ある」で登録する（塩・醤油など）。
	registerAvailable?: (ingredientName: string) => Promise<void>;
	// 買い物メモの画面の中では、「買い物メモを開く」のリンクを出さない。
	resultLink?: React.ReactNode;
};

// 「買い物メモに入れる」の中身：説明・同じものがあるときの扱い・材料の行・結果。
export function RecipeShoppingRows({
	plan,
	ownerScope,
	registerAvailable,
	resultLink,
}: RecipeShoppingRowsProps) {
	const { rows } = plan;
	const isGuest = ownerScope === "guest";

	return (
		<div className={styles.container}>
			<p className={styles.hint}>
				{isGuest
					? "ログインすると、在庫と比べて、足りないものだけを選べます。"
					: "在庫と比べて、足りないものを選んでいます。人数による量の調整は、していません（レシピの量のままです）。"}
			</p>

			{plan.isLoading ? <p className={styles.hint}>読み込んでいます…</p> : null}

			<RadioList
				legend="メモに同じものがあるとき"
				name="recipe-shopping-duplicate"
				options={duplicateModeOptions}
				value={plan.duplicateMode}
				onChange={plan.setDuplicateMode}
			/>

			<ul className={styles.card}>
				{rows.map((row, index) => {
					const stock = describeStock(row);
					const existingText = describeExisting(row);
					const canRegister =
						registerAvailable !== undefined &&
						row.stock.kind === "judged" &&
						row.stock.judgment.status === "short" &&
						!row.stock.judgment.hasStock;

					return (
						<Fragment key={row.need.id}>
							{row.need.sectionTitle &&
							row.need.sectionTitle !== rows[index - 1]?.need.sectionTitle ? (
								<li className={styles.sectionHeading}>
									{row.need.sectionTitle}
								</li>
							) : null}

							<li className={styles.row}>
								<Checkbox
									label={`${row.need.name}を買い物メモに入れる`}
									checked={plan.isChecked(row)}
									disabled={row.plan === "keep"}
									onChange={(event) =>
										plan.setChecked(row, event.target.checked)
									}
								/>

								<div className={styles.rowBody}>
									<div className={styles.rowTop}>
										<span className={styles.rowName}>{row.need.name}</span>

										{row.need.amountText ? (
											<span className={styles.amountText}>
												{row.need.amountText}
											</span>
										) : null}
									</div>

									<span
										className={
											stock.isShort ? styles.shortStatus : styles.status
										}
									>
										{stock.text}
									</span>

									{row.need.mergedAmountTexts &&
									row.need.mergedAmountTexts.length > 1 ? (
										<span className={styles.status}>
											{row.need.mergedAmountTexts.length}
											行をまとめています（
											{row.need.mergedAmountTexts.join(" ＋ ")}）
										</span>
									) : null}

									{existingText ? (
										<span className={styles.existing}>
											<Icon name="info-circle" size={16} />
											{existingText}
										</span>
									) : null}

									{canRegister ? (
										<div className={styles.rowAction}>
											<Button
												variant="secondary"
												size="sm"
												aria-label={`${row.need.name}を在庫に「ある」で登録する`}
												onClick={() =>
													void plan.registerAvailableFor(
														registerAvailable,
														row.need.name,
													)
												}
											>
												ある（在庫に登録）
											</Button>
										</div>
									) : null}
								</div>
							</li>
						</Fragment>
					);
				})}
			</ul>

			{plan.errorMessage ? <Note tone="error">{plan.errorMessage}</Note> : null}

			{plan.resultMessage ? (
				<Note tone="success">
					{plan.resultMessage}。{resultLink}
				</Note>
			) : null}
		</div>
	);
}
