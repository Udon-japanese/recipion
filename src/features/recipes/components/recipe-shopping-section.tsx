import { Link } from "@tanstack/react-router";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import type { ShoppingRepository } from "#/features/shopping/application/shopping-repository";
import type { ShoppingItem } from "#/features/shopping/domain/shopping-item";
import { dexieShoppingRepository } from "#/features/shopping/infrastructure/dexie-shopping-repository";
import {
	buildShoppingChanges,
	type ShoppingDestination,
} from "../application/build-shopping-changes";
import {
	type LinkedShoppingSections,
	loadLinkedShoppingSections,
} from "../application/load-linked-shopping-sections";
import type { RecipeDetail } from "../application/recipe-repository";
import { resolveIngredientLinks } from "../domain/link-ingredient-needs";
import { mergeRecipeNeeds } from "../domain/merge-recipe-needs";
import {
	type DuplicateMode,
	flattenRecipeIngredients,
	planShoppingFromRecipe,
	type RecipeShoppingRow,
} from "../domain/plan-shopping-from-recipe";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
import * as styles from "./recipe-shopping-section.css";

type RecipeShoppingSectionProps = {
	ingredients: readonly RecipeEditorIngredientNode[];
	// 材料の [[ラベル]] の、リンク先。リンク先が見つからない材料は、候補にしない。
	linkViews?: readonly RecipeLinkView[];
	// リンク先のレシピを取ってくる。リンクした材料は、そのレシピの材料を、展開して判定する。
	loadLinkedRecipe?: (publicId: string) => Promise<RecipeDetail | null>;
	ownerScope: InventoryPurchaseOwnerScope | null;
	// ログインしているとき、在庫の一覧を取得する（ゲストでは、呼ばない）。
	loadInventoryItems?: () => Promise<InventoryListItem[]>;
	shoppingRepository?: ShoppingRepository;
	// 「ある」を押したとき、その食材を、在庫に「ある」で登録する（塩・醤油など）。
	registerAvailable?: (ingredientName: string) => Promise<void>;
	// 買い物メモの画面の中で使うとき（レシピから入れる）。開いた状態で始め、閉じると onClose を呼ぶ。
	// 「買い物メモを開く」のリンクは出さない。
	embedded?: {
		onClose: () => void;
		// 入れたあとに呼ぶ（買い物メモの画面が、一覧を読み直す）。
		onApplied?: () => void;
		// 入れ先。省略は通常のメモ。条件つきのメモの側にも入れられる。
		destination?: ShoppingDestination;
	};
};

const duplicateModeLabels: Record<DuplicateMode, string> = {
	max: "多い方に合わせる",
	sum: "合算する",
	skip: "追加しない",
};

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

// レシピの材料を、在庫と比べて、足りないものを、買い物メモに入れる。
// 人数による量の調整はしない（レシピの量のまま）。
const noLinkViews: readonly RecipeLinkView[] = [];
const noLinkedSections: LinkedShoppingSections = {
	sections: [],
	failedNames: [],
};

export function RecipeShoppingSection({
	ingredients,
	linkViews = noLinkViews,
	loadLinkedRecipe,
	ownerScope,
	loadInventoryItems,
	shoppingRepository = dexieShoppingRepository,
	registerAvailable,
	embedded,
}: RecipeShoppingSectionProps) {
	const [isOpen, setIsOpen] = useState(embedded !== undefined);
	// 入れ先を考えた、新しい項目の並び順の起点（全項目の最大値）。
	const [highestSortOrder, setHighestSortOrder] = useState(-1);
	const destination = embedded?.destination;
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultMessage, setResultMessage] = useState<string | null>(null);
	const [stockItems, setStockItems] = useState<InventoryListItem[] | null>(
		null,
	);
	const [memoItems, setMemoItems] = useState<ShoppingItem[]>([]);
	const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("max");
	// ユーザーが、初期のチェックを変えた行（食材の ID → チェックの有無）。
	const [checkedOverrides, setCheckedOverrides] = useState<
		Record<string, boolean>
	>({});
	const [isApplying, setIsApplying] = useState(false);

	const [linkedSections, setLinkedSections] =
		useState<LinkedShoppingSections>(noLinkedSections);

	// リンクの材料は、リンク先のレシピの材料に置き換える（リンク先の材料は、開いたときに取ってくる）。
	const resolvedNeeds = useMemo(
		() =>
			resolveIngredientLinks(flattenRecipeIngredients(ingredients), linkViews),
		[ingredients, linkViews],
	);

	// 同じ食材の行（「オリーブオイル 大さじ1」と「オリーブオイル 少し」など）は、1行にまとめる。
	const needs = useMemo(
		() =>
			mergeRecipeNeeds([
				...resolvedNeeds.filter((need) => !need.linkedRecipe),
				...linkedSections.sections.flatMap((section) => section.needs),
			]),
		[resolvedNeeds, linkedSections],
	);

	// 未購入の買い物項目だけを、重複の対象にする。
	const unpurchasedMemoItems = useMemo(
		() => memoItems.filter((item) => item.status !== "purchased"),
		[memoItems],
	);

	const rows = useMemo(
		() =>
			planShoppingFromRecipe({
				needs,
				stockItems,
				memoItems: unpurchasedMemoItems.map((item) => ({
					id: item.id,
					name: item.name,
					quantity: item.quantity,
					unitLabel: item.unitLabel,
				})),
				duplicateMode,
			}),
		[needs, stockItems, unpurchasedMemoItems, duplicateMode],
	);

	const isChecked = (row: RecipeShoppingRow): boolean =>
		row.plan === "keep"
			? false
			: (checkedOverrides[row.need.id] ?? row.defaultChecked);

	const selectedNeedIds = new Set(
		rows.filter(isChecked).map((row) => row.need.id),
	);

	// 重複の判定に使う項目。通常のメモに入れるときは、条件つきのメモの中の項目を除く
	// （まだ買うと決まっていないため）。条件つきのメモの側に入れるときは、その側の項目だけ。
	const loadMemoItems = useCallback(async () => {
		const all = await shoppingRepository.list();

		setHighestSortOrder(
			all.reduce((highest, item) => Math.max(highest, item.sortOrder), -1),
		);

		return destination
			? all.filter(
					(item) =>
						item.branchId === destination.branchId &&
						item.branchSide === destination.side,
				)
			: all.filter((item) => !item.branchId);
	}, [destination, shoppingRepository]);

	const load = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			setMemoItems(await loadMemoItems());
		} catch {
			setErrorMessage("買い物メモを読み込めませんでした");
		}

		if (ownerScope && ownerScope !== "guest" && loadInventoryItems) {
			try {
				setStockItems(await loadInventoryItems());
			} catch {
				setStockItems(null);
				setErrorMessage(
					"在庫を読み込めませんでした。在庫の情報なしとして、表示しています",
				);
			}
		} else {
			setStockItems(null);
		}

		if (loadLinkedRecipe && resolvedNeeds.some((need) => need.linkedRecipe)) {
			const result = await loadLinkedShoppingSections(
				resolvedNeeds,
				loadLinkedRecipe,
			);

			setLinkedSections(result);

			if (result.failedNames.length > 0) {
				setErrorMessage(
					`${result.failedNames.join("、")}の材料を読み込めませんでした`,
				);
			}
		}

		setIsLoading(false);
	}, [
		loadInventoryItems,
		loadLinkedRecipe,
		loadMemoItems,
		ownerScope,
		resolvedNeeds,
	]);

	// 買い物メモの画面の中では、開いた状態で始まるので、最初に読み込む。
	const hasAutoLoaded = useRef(false);

	useEffect(() => {
		if (embedded && !hasAutoLoaded.current) {
			hasAutoLoaded.current = true;
			void load();
		}
	}, [embedded, load]);

	async function handleOpen() {
		setIsOpen(true);
		setResultMessage(null);
		setCheckedOverrides({});
		setLinkedSections(noLinkedSections);
		await load();
	}

	async function handleApply() {
		const changes = buildShoppingChanges(
			rows,
			selectedNeedIds,
			memoItems,
			undefined,
			{ destination, highestSortOrder },
		);

		if (changes.created.length === 0 && changes.updated.length === 0) {
			setResultMessage("買い物メモに入れるものが、選ばれていません");

			return;
		}

		setIsApplying(true);
		setErrorMessage(null);

		try {
			await shoppingRepository.saveAll([
				...changes.created,
				...changes.updated,
			]);

			setResultMessage(
				[
					changes.created.length > 0
						? `${changes.created.length}件を追加`
						: null,
					changes.updated.length > 0
						? `${changes.updated.length}件の数量を更新`
						: null,
				]
					.filter(Boolean)
					.join("、"),
			);
			setCheckedOverrides({});
			setMemoItems(await loadMemoItems());
			embedded?.onApplied?.();
		} catch {
			setErrorMessage(
				"買い物メモに保存できませんでした。もう一度お試しください",
			);
		} finally {
			setIsApplying(false);
		}
	}

	async function handleRegisterAvailable(ingredientName: string) {
		if (!registerAvailable) {
			return;
		}

		setErrorMessage(null);

		try {
			await registerAvailable(ingredientName);
			await load();
		} catch {
			setErrorMessage("在庫に登録できませんでした。通信を確認してください");
		}
	}

	if (resolvedNeeds.length === 0) {
		return null;
	}

	if (!isOpen) {
		return (
			<div className={styles.container}>
				<button
					className={styles.openButton}
					type="button"
					onClick={() => void handleOpen()}
				>
					買い物メモに入れる
				</button>
			</div>
		);
	}

	const isGuest = ownerScope === "guest";

	return (
		<section className={styles.container} aria-label="買い物メモに入れる">
			<div className={styles.panel}>
				<h3 className={styles.heading}>買い物メモに入れる</h3>

				<p className={styles.hint}>
					{isGuest
						? "ログインすると、在庫と比べて、足りないものだけを選べます。"
						: "在庫と比べて、足りないものを選んでいます。人数による量の調整は、していません（レシピの量のままです）。"}
				</p>

				{isLoading ? <p className={styles.hint}>読み込んでいます…</p> : null}

				<div className={styles.field}>
					<label className={styles.label} htmlFor="recipe-shopping-duplicate">
						メモに同じものがあるとき
					</label>
					<select
						className={styles.select}
						id="recipe-shopping-duplicate"
						value={duplicateMode}
						onChange={(event) =>
							setDuplicateMode(event.target.value as DuplicateMode)
						}
					>
						{(Object.keys(duplicateModeLabels) as DuplicateMode[]).map(
							(mode) => (
								<option value={mode} key={mode}>
									{duplicateModeLabels[mode]}
								</option>
							),
						)}
					</select>
				</div>

				<ul className={styles.list}>
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
									<input
										type="checkbox"
										checked={isChecked(row)}
										disabled={row.plan === "keep"}
										aria-label={`${row.need.name}を買い物メモに入れる`}
										onChange={(event) =>
											setCheckedOverrides((current) => ({
												...current,
												[row.need.id]: event.target.checked,
											}))
										}
									/>

									<div className={styles.rowBody}>
										<span className={styles.rowName}>
											{row.need.name}
											{row.need.amountText ? (
												<span className={styles.amountText}>
													{row.need.amountText}
												</span>
											) : null}
										</span>

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
											<span className={styles.status}>{existingText}</span>
										) : null}

										{canRegister ? (
											<button
												className={styles.smallButton}
												type="button"
												aria-label={`${row.need.name}を在庫に「ある」で登録する`}
												onClick={() =>
													void handleRegisterAvailable(row.need.name)
												}
											>
												ある（在庫に登録）
											</button>
										) : null}
									</div>
								</li>
							</Fragment>
						);
					})}
				</ul>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}

				{resultMessage ? (
					<output className={styles.hint}>
						{resultMessage}。
						{embedded ? null : <Link to="/shopping">買い物メモを開く</Link>}
					</output>
				) : null}

				<div className={styles.actions}>
					<button
						className={styles.cancelButton}
						type="button"
						disabled={isApplying}
						onClick={() => {
							setIsOpen(false);
							embedded?.onClose();
						}}
					>
						閉じる
					</button>
					<Button
						status={isApplying ? "pending" : "idle"}
						pendingLabel="追加中"
						disabled={isLoading}
						onClick={() => void handleApply()}
					>
						{`選んだものを入れる（${selectedNeedIds.size}件）`}
					</Button>
				</div>
			</div>
		</section>
	);
}
