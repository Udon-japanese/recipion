import { Fragment } from "react";
import { Button } from "#/components/button/button";
import { Checkbox } from "#/components/checkbox/checkbox";
import { Icon } from "#/components/icon/icon";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import { useMediaQuery } from "#/components/use-media-query";
import {
	formatQuantityForUnit,
	formatStockAmount,
} from "#/features/quantity/domain/format-quantity";
import { describeAmount } from "../domain/merge-recipe-needs";
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

	// 使うかを本人が選ぶ代わりの食材（設定・形の決まった冷凍）は、足りているとは判定せず、在庫の量とともに知らせる。
	// 量を満たすものだけが入っている（足りないものは、知らせない）。
	const standIns =
		row.stock.kind === "judged" ? row.stock.askStandIns : undefined;

	if (!standIns || standIns.length === 0) {
		return base;
	}

	const names = standIns
		.map((standIn) =>
			standIn.isPresenceOnly
				? standIn.name
				: `${standIn.name} ${formatStockAmount(standIn.quantity, standIn.stockUnitCode)}${standIn.stockUnitLabel}`,
		)
		.join("、");

	return {
		...base,
		text: `${base.text}（${names}の在庫で足ります。使うなら、外してください）`,
	};
}

function describeStockBase(row: RecipeShoppingRow): {
	text: string;
	isShort: boolean;
} {
	if (row.stock.kind === "unknown") {
		return { text: "在庫の情報なし", isShort: true };
	}

	if (row.stock.kind === "unmanaged") {
		return { text: "管理しない材料", isShort: false };
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
	// 「管理しない」を押したとき、その材料を「管理しない材料」にする（水など）。
	markUnmanaged?: (ingredientName: string) => Promise<void>;
	// 買い物メモの画面の中では、「買い物メモを開く」のリンクを出さない。
	resultLink?: React.ReactNode;
	// レシピの量と違う量で入れるときの知らせ（「4人分の量で入れます（レシピは2人分）」）。
	amountNote?: string | null;
};

// 「買い物メモに入れる」の中身：説明・同じものがあるときの扱い・材料の行・結果。
export function RecipeShoppingRows({
	plan,
	ownerScope,
	registerAvailable,
	markUnmanaged,
	resultLink,
	amountNote,
}: RecipeShoppingRowsProps) {
	const { rows } = plan;
	const isGuest = ownerScope === "guest";

	return (
		<div className={styles.container}>
			<p className={styles.hint}>
				{isGuest
					? "ログインすると、在庫と比べて、足りないものだけを選べます。"
					: "在庫と比べて、足りないものを選んでいます。"}
				{amountNote ? (
					<>
						<br />
						{amountNote}
					</>
				) : null}
			</p>

			{plan.isLoading ? (
				<Note tone="info" spinning>
					読み込んでいます…
				</Note>
			) : null}

			{/* 結果は、一覧の上に出す（下だと、長い一覧では目に入らない）。 */}
			{plan.errorMessage ? <Note tone="error">{plan.errorMessage}</Note> : null}

			{plan.resultMessage ? (
				<Note tone="success">
					{plan.resultMessage}。{resultLink}
				</Note>
			) : null}

			{plan.madeUses.map((use) => (
				<p className={styles.hint} key={use.publicId}>
					{`在庫の${use.name}を${formatStockAmount(use.quantity, "count")}回分、使います。その分の材料は、入れません。`}
				</p>
			))}

			<RadioList
				legend="メモに同じものがあるとき"
				name="recipe-shopping-duplicate"
				options={duplicateModeOptions}
				value={plan.duplicateMode}
				onChange={plan.setDuplicateMode}
			/>

			<ul className={styles.card}>
				{rows.length > 1 ? (
					<GroupHeading
						plan={plan}
						title="すべて"
						label="すべての材料をまとめて買い物メモに入れる"
						group={rows}
					/>
				) : null}

				{rows.map((row, index) => {
					const stock = describeStock(row);
					const existingText = describeExisting(row);
					// 在庫がない材料だけ、「ある」で登録するか、「管理しない」にするかを選べる。
					const hasNoStock =
						row.stock.kind === "judged" &&
						row.stock.judgment.status === "short" &&
						!row.stock.judgment.hasStock;
					const canRegister = registerAvailable !== undefined && hasNoStock;
					const canMarkUnmanaged = markUnmanaged !== undefined && hasNoStock;

					return (
						<Fragment key={row.need.id}>
							{row.need.sectionTitle &&
							row.need.sectionTitle !== rows[index - 1]?.need.sectionTitle ? (
								<GroupHeading
									plan={plan}
									title={row.need.sectionTitle}
									label={`${row.need.sectionTitle}をまとめて買い物メモに入れる`}
									group={rows.filter(
										(other) =>
											other.need.sectionTitle === row.need.sectionTitle,
									)}
								/>
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

									{row.need.range ? (
										<span className={styles.status}>
											{`多い方の${describeAmount(row.need.range.max, row.need.unitLabel)}で比べています`}
										</span>
									) : null}

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

									{canRegister || canMarkUnmanaged ? (
										<div className={styles.rowAction}>
											{canRegister ? (
												<Button
													variant="secondary"
													size="sm"
													status={
														plan.isRegistering(row.need.name)
															? "pending"
															: "idle"
													}
													pendingLabel="登録中"
													disabled={plan.isMarkingUnmanaged(row.need.name)}
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
											) : null}
											{canMarkUnmanaged ? (
												<Button
													variant="ghost"
													size="sm"
													status={
														plan.isMarkingUnmanaged(row.need.name)
															? "pending"
															: "idle"
													}
													pendingLabel="変更中"
													disabled={plan.isRegistering(row.need.name)}
													aria-label={`${row.need.name}を管理しない材料にする`}
													onClick={() =>
														void plan.markUnmanagedFor(
															markUnmanaged,
															row.need.name,
														)
													}
												>
													管理しない
												</Button>
											) : null}
										</div>
									) : null}
								</div>
							</li>
						</Fragment>
					);
				})}
			</ul>
		</div>
	);
}

type GroupHeadingProps = {
	plan: ReturnType<typeof useRecipeShoppingPlan>;
	title: string;
	label: string;
	group: readonly RecipeShoppingRow[];
};

// まとめのチェックの見出し（一覧の先頭の「すべて」と、リンクした料理の材料）。見出しのチェックで、まとめて選ぶ・外す。
function GroupHeading({ plan, title, label, group }: GroupHeadingProps) {
	const state = plan.getGroupCheckState(group);

	return (
		<li className={styles.sectionHeading}>
			<Checkbox
				label={label}
				checked={state === "all"}
				indeterminate={state === "some"}
				disabled={group.every((row) => row.plan === "keep")}
				onChange={(event) => plan.setGroupChecked(group, event.target.checked)}
			/>
			<span className={styles.sectionTitle}>{title}</span>
		</li>
	);
}

type RecipeShoppingFooterProps = {
	plan: ReturnType<typeof useRecipeShoppingPlan>;
	onClose: () => void;
};

// 下の操作：閉じる・入れる（主ボタンを右）。PC は右寄せ。スマホは横に並べ、件数まで読めるよう、
// 入れるは文字の幅にし、文字を一段小さくする（360px の幅で「（12件）」まで、閉じるも切れずに収まる）。
export function RecipeShoppingFooter({
	plan,
	onClose,
}: RecipeShoppingFooterProps) {
	const isWide = useMediaQuery("(min-width: 768px)");
	const isApplied = plan.appliedCount !== null;
	// 保存中と、入れ終えたあとは、押したときの件数のまま見せる。
	const count = plan.appliedCount ?? plan.selectedCount;

	return (
		<div className={styles.footer}>
			<Button
				variant="secondary"
				size={isWide ? "lg" : "md"}
				fullWidth={!isWide}
				disabled={plan.isApplying}
				onClick={onClose}
			>
				閉じる
			</Button>

			<Button
				size={isWide ? "lg" : "md"}
				fullWidth={!isWide}
				status={plan.isApplying ? "pending" : isApplied ? "success" : "idle"}
				pendingLabel="追加中"
				successLabel="入れました"
				// 入れ終えたら、チェックを変えるまで押せない（同じものを、もう一度入れないように）。
				// 「ある」の登録中も、在庫の読み直しが済むまで待つ（在庫に入れたものを、メモにも入れないように）。
				disabled={plan.isLoading || plan.hasRegistering || isApplied}
				onClick={() => void plan.apply()}
			>
				{isApplied
					? `入れました（${count}件）`
					: `選んだものを入れる（${count}件）`}
			</Button>
		</div>
	);
}
