import { type CSSProperties, useState } from "react";
import { Avatar } from "#/components/avatar/avatar";
import { Button } from "#/components/button/button";
import { ButtonLink } from "#/components/button/button-link";
import { useButtonAction } from "#/components/button/use-button-action";
import { Card } from "#/components/card/card";
import { Checkbox } from "#/components/checkbox/checkbox";
import { Chip, ChipGroup, ChipUnit } from "#/components/chip/chip";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { DateField } from "#/components/date-picker/date-picker";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import {
	Field,
	SelectBox,
	TextArea,
	TextInput,
} from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import {
	type IconName,
	iconDefinitions,
} from "#/components/icon/icon-definitions";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	ListRow,
	ListRowMeta,
	ListRowName,
} from "#/components/list-row/list-row";
import { Mascot } from "#/components/mascot/mascot";
import { Menu } from "#/components/menu/menu";
import { Note } from "#/components/note/note";
import { RadioList } from "#/components/radio-list/radio-list";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { Tag } from "#/components/tag/tag";
import { Toast } from "#/components/toast/toast";
import { Toggle } from "#/components/toggle/toggle";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { RecipeConsumeSection } from "#/features/recipes/components/recipe-consume-section";
import type { RecipeEditorIngredientNode } from "#/features/recipes/domain/recipe-editor-document";
import {
	type BranchCardSide,
	type BranchCardView,
	ShoppingBranchCard,
} from "#/features/shopping/components/shopping-branch-card";
import {
	type BranchConditionValue,
	ShoppingBranchConditionEditor,
} from "#/features/shopping/components/shopping-branch-condition-editor";
import { DishPartsGallery } from "./dish-parts-gallery";

// 開発中だけの、部品の確認用ページの中身（/dev/ui。本番では、404）。
// 部品を足したら、ここに並べる。デザインの依頼の、スクリーンショットにも使う。
const page: CSSProperties = {
	display: "grid",
	gap: 32,
	maxWidth: 880,
	margin: "0 auto",
	padding: 24,
};
const row: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 16,
};
const note: CSSProperties = {
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
};

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section style={{ display: "grid", gap: 12 }}>
			<h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
			{description ? <p style={note}>{description}</p> : null}
			{children}
		</section>
	);
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// 押すと、決まった時間のあと、成功または失敗になるボタン。
function PlayButton({
	label,
	ms,
	ok,
	variant = "primary",
}: {
	label: string;
	ms: number;
	ok: boolean;
	variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
	const action = useButtonAction();

	return (
		<Button
			variant={variant}
			status={action.status}
			successLabel="追加しました"
			errorLabel="失敗しました"
			onClick={() =>
				action.run(async () => {
					await wait(ms);
					return ok;
				})
			}
		>
			{label}
		</Button>
	);
}

// 処理中の、白い丸の中のれしぽよ。ボタンが縮んだときの形を、そのまま再現する。
function LoadingCircle({
	background,
	mascotColor,
	outlineColor,
	outlineWidth,
}: {
	background: string;
	mascotColor?: string;
	outlineColor?: string;
	outlineWidth?: string;
}) {
	return (
		<span
			style={{
				display: "inline-grid",
				placeItems: "center",
				width: 44,
				height: 44,
				boxSizing: "border-box",
				border: "1px solid var(--color-border-strong)",
				borderRadius: "50%",
				background,
				boxShadow: "var(--shadow-sm)",
				overflow: "hidden",
				"--color-mascot": mascotColor,
				"--mascot-outline-color": outlineColor,
				"--mascot-outline-width": outlineWidth,
			}}
		>
			<Mascot size={19 * (44 / 52)} motion="loop" />
		</span>
	);
}

function ColorOption({
	name,
	detail,
	children,
}: {
	name: string;
	detail: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{ display: "grid", justifyItems: "center", gap: 8, width: 150 }}
		>
			{children}
			<strong style={{ fontSize: 14 }}>{name}</strong>
			<span style={{ ...note, textAlign: "center" }}>{detail}</span>
		</div>
	);
}

export function UiGallery() {
	return (
		<div style={page}>
			<h1 style={{ margin: 0 }}>部品の確認（開発用）</h1>

			<Section
				title="れしぽよの色（処理中の丸）"
				description="処理中のボタンは、この丸になる。黄色の体の見え方の案。白地・薄い黄色の地、どちらも並べている。"
			>
				<div style={row}>
					<ColorOption name="A. 現在" detail="体 #E9A900。丸は白">
						<LoadingCircle background="var(--color-surface)" />
					</ColorOption>
					<ColorOption
						name="B. 濃い縁"
						detail="体は同じ。縁に #C78A00（1.5px）"
					>
						<LoadingCircle
							background="var(--color-surface)"
							outlineColor="var(--color-primary-pressed)"
							outlineWidth="1.5px"
						/>
					</ColorOption>
					<ColorOption name="C. 体を濃く" detail="体 #D99600。縁なし">
						<LoadingCircle
							background="var(--color-surface)"
							mascotColor="var(--color-primary-hover)"
						/>
					</ColorOption>
					<ColorOption
						name="D. 薄い黄色の丸"
						detail="丸の背景が #FFF3C4。体は現在のまま"
					>
						<LoadingCircle background="var(--color-primary-soft)" />
					</ColorOption>
				</div>
				<p style={note}>拡大した姿（体の幅 60px）：</p>
				<div style={row}>
					<ColorOption name="A" detail="現在">
						<div
							style={{ background: "var(--color-surface)", borderRadius: 16 }}
						>
							<Mascot size={60} motion="loop" />
						</div>
					</ColorOption>
					<ColorOption name="B" detail="濃い縁">
						<div
							style={{
								background: "var(--color-surface)",
								borderRadius: 16,
								"--mascot-outline-color": "var(--color-primary-pressed)",
								"--mascot-outline-width": "3px",
							}}
						>
							<Mascot size={60} motion="loop" />
						</div>
					</ColorOption>
					<ColorOption name="C" detail="体を濃く">
						<div
							style={{
								background: "var(--color-surface)",
								borderRadius: 16,
								"--color-mascot": "var(--color-primary-hover)",
							}}
						>
							<Mascot size={60} motion="loop" />
						</div>
					</ColorOption>
					<ColorOption name="D" detail="薄い黄色の地">
						<div
							style={{
								background: "var(--color-primary-soft)",
								borderRadius: 16,
							}}
						>
							<Mascot size={60} motion="loop" />
						</div>
					</ColorOption>
				</div>
			</Section>

			<Section
				title="ボタンの種類と大きさ"
				description="通常の状態。hover・押下・フォーカス（Tab）も、ここで確かめる。"
			>
				{(["primary", "secondary", "danger", "ghost"] as const).map(
					(variant) => (
						<div key={variant} style={row}>
							<code style={{ width: 80 }}>{variant}</code>
							<Button variant={variant} size="sm">
								小さい
							</Button>
							<Button variant={variant}>ふつう</Button>
							<Button variant={variant} size="lg">
								大きい
							</Button>
							<Button variant={variant} disabled>
								無効
							</Button>
						</div>
					),
				)}
			</Section>

			<Section
				title="無効の理由（押したときだけ出る）"
				description="無効のボタンを押す（タップ・Enter）と、短い理由が一瞬出る。"
			>
				<div style={row}>
					<Button disabled disabledReason="メールアドレスを入力してください">
						コードを送る
					</Button>
					<Button
						variant="secondary"
						disabled
						disabledReason="先に、食材の名前を入れてください"
					>
						在庫に追加
					</Button>
				</div>
			</Section>

			<Section
				title="押すと変形するボタン"
				description="処理中 → 完了/失敗。短い処理（30ms）は、れしぽよを出さず、すぐ完了へ。完了・失敗の表示中も、続けて押せる。"
			>
				<div style={row}>
					<PlayButton label="成功（2.5秒）" ms={2500} ok />
					<PlayButton label="成功（30ms）" ms={30} ok />
					<PlayButton label="失敗（1.2秒）" ms={1200} ok={false} />
				</div>
				<div style={row}>
					<PlayButton variant="secondary" label="副（1.5秒）" ms={1500} ok />
					<PlayButton variant="danger" label="危険（1.5秒）" ms={1500} ok />
					<PlayButton variant="ghost" label="ghost（1.5秒）" ms={1500} ok />
				</div>
				<div style={{ ...row, flexWrap: "nowrap" }}>
					<PlayButton label="隣の要素がある行" ms={1500} ok />
					<span>← 広がると、この文字が押される</span>
				</div>
			</Section>

			<Section
				title="アイコン付きと、リンクのボタン"
				description="アイコンは、差し込み口の確認用の記号（実際のアイコンは、デザインで決める）。"
			>
				<div style={row}>
					<Button leadingIcon={<span>＋</span>}>追加する</Button>
					<Button variant="secondary" leadingIcon={<span>↩</span>}>
						元に戻す
					</Button>
					<ButtonLink to="/" variant="primary">
						ホームへ（リンク）
					</ButtonLink>
					<ButtonLink to="/" variant="secondary">
						ホームへ（副）
					</ButtonLink>
					<ButtonLink to="/" variant="ghost">
						ホームへ（ghost）
					</ButtonLink>
				</div>
			</Section>

			<Section
				title="アイコン"
				description="デザインの icons.zip（24×24・線 2px・色は文字の色）。16・20・24 の3つの大きさ。"
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
						gap: 12,
					}}
				>
					{(Object.keys(iconDefinitions) as IconName[]).map((name) => (
						<div
							key={name}
							style={{
								display: "grid",
								justifyItems: "center",
								gap: 8,
								padding: "12px 4px",
								border: "1px solid var(--color-border)",
								borderRadius: 16,
								background: "var(--color-surface)",
								fontSize: 12,
							}}
						>
							<span style={{ display: "flex", gap: 10, alignItems: "center" }}>
								<Icon name={name} size={16} />
								<Icon name={name} size={20} />
								<Icon name={name} size={24} />
							</span>
							<code>{name}</code>
						</div>
					))}
				</div>
			</Section>

			<DishPartsGallery />
			<PartsGallery />

			<SheetGallery />
			<BranchGallery />

			<Section title="れしぽよの大きさ">
				<div style={row}>
					<Mascot size={19} />
					<Mascot size={40} />
					<Mascot size={80} motion="loop" />
					<Mascot size={120} motion="still" />
				</div>
				<p style={note}>
					左の2つは、押すと1回だけ跳ねる（ふだんの使い方）。3つ目は、跳ね続ける（読み込み中）。右端は、止まったままの姿勢（動きを減らす設定も、これ）。
				</p>
			</Section>
		</div>
	);
}

const snapPointsTwo = [0.62, 0.92];
const snapPointsOne = [0.92];
const sampleRows = Array.from({ length: 24 }, (_, index) => index + 1);

function PartsGallery() {
	const [view, setView] = useState<"list" | "store">("list");
	const [pressed, setPressed] = useState("1週間");
	const [checked, setChecked] = useState(false);
	const [toggled, setToggled] = useState(true);
	const [text, setText] = useState("");
	const [date, setDate] = useState("");

	return (
		<>
			<Section
				title="日付の欄"
				description="PC は、打って入れられる欄＋カレンダー（ポップオーバー）。スマホ（幅 768px 未満）は、欄を押すと、下のシートでカレンダーが開く。"
			>
				<div style={{ maxWidth: 360 }}>
					<DateField
						aria-label="日付の欄の例"
						value={date}
						today="2026-10-31"
						onChange={setDate}
					/>
				</div>
				<p style={{ margin: 0 }}>選んだ日：{date === "" ? "（なし）" : date}</p>
			</Section>

			<Section
				title="部品（第1弾）：ボタン類"
				description="アイコンボタン（見た目 36px・押せる範囲 44px）、タグ（枠なし＝押せない）、チップ（枠あり＝押せる）。"
			>
				<div style={row}>
					<IconButton icon="edit" label="編集" />
					<IconButton icon="more-horizontal" label="その他" />
					<IconButton icon="trash" label="削除" tone="danger" />
					<IconButton
						icon="chevron-left"
						label="戻る"
						size="std"
						tone="plain"
					/>
					<IconButton icon="close" label="閉じる" size="std" />
					<IconButton icon="sync" label="更新" tone="on" />
					<IconButton icon="plus" label="追加" disabled />
					<Avatar name="れしぴょなー" />
				</div>
				<div style={row}>
					<Tag>残り 3</Tag>
					<Tag icon="clock" tone="warn">
						明日
					</Tag>
					<Tag icon="alert-triangle" tone="error">
						切れ
					</Tag>
					<Tag tone="soft">自分だけ</Tag>
					<Tag icon="check" tone="success">
						3
					</Tag>
					<Tag icon="clock" tone="warn" approximate>
						3日
					</Tag>
				</div>
				<ChipGroup label="期限">
					{["3日", "1週間", "2週間", "1か月"].map((label) => (
						<Chip
							key={label}
							pressed={pressed === label}
							onClick={() => setPressed(label)}
						>
							{label}
						</Chip>
					))}
					<Chip icon="calendar">日付</Chip>
					<Chip disabled>使えない</Chip>
				</ChipGroup>
				<ChipGroup label="数量">
					<Chip size="qty">1</Chip>
					<Chip size="qty">
						50<ChipUnit>g</ChipUnit>
					</Chip>
					<Chip size="qty">1/2</Chip>
				</ChipGroup>
			</Section>

			<Section
				title="部品（第4弾）：行・メニュー"
				description="行（先頭にチェック、中央に名前と補足、後ろに操作）と、押すと出る短いメニュー（矢印・Esc・外を押すで閉じる）。"
			>
				<ul
					style={{
						maxWidth: 420,
						margin: 0,
						padding: "0 12px 0 8px",
						listStyle: "none",
						background: "var(--color-surface)",
						borderRadius: 20,
					}}
				>
					<ListRow
						leading={<Checkbox label="トマトをチェック" />}
						actions={
							<Menu
								label="トマトのその他"
								icon="more-horizontal"
								items={[
									{ label: "編集", icon: "edit", onSelect: () => {} },
									{
										label: "上へ",
										icon: "arrow-up",
										disabled: true,
										onSelect: () => {},
									},
									{
										label: "削除",
										icon: "trash",
										tone: "danger",
										onSelect: () => {},
									},
								]}
							/>
						}
					>
						<ListRowName>トマト</ListRowName>
						<ListRowMeta>
							<Chip>2個</Chip>
							<Tag icon="store">スーパーA</Tag>
						</ListRowMeta>
					</ListRow>
					<ListRow
						leading={<Checkbox label="玉ねぎをチェック" defaultChecked />}
					>
						<ListRowName done>玉ねぎ</ListRowName>
						<ListRowMeta>
							<Chip>3個</Chip>
						</ListRowMeta>
					</ListRow>
				</ul>
			</Section>

			<Section
				title="部品（第1弾）：入力"
				description="丸い入力欄（枠が濃い＝入力できる）。ラベル・補足・エラーの結びつきは、Field が行う。"
			>
				<div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
					<Field label="メールアドレス" hint="ログイン用のコードを送ります">
						{(control) => (
							<TextInput
								{...control}
								type="email"
								placeholder="name@example.com"
								value={text}
								onChange={(event) => setText(event.target.value)}
							/>
						)}
					</Field>
					<Field label="食材名" error="食材名を入力してください">
						{(control) => <TextInput {...control} placeholder="例：塩、醤油" />}
					</Field>
					<Field label="在庫の単位" optional>
						{(control) => (
							<SelectBox {...control}>
								<option>g</option>
								<option>個</option>
							</SelectBox>
						)}
					</Field>
					<Field label="申し立ての内容">
						{(control) => <TextArea {...control} placeholder="内容" />}
					</Field>
					<TextInput placeholder="使えない欄" disabled />
					<SegmentedControl
						label="表示の切り替え"
						value={view}
						onChange={setView}
						options={[
							{ value: "list", label: "一覧", icon: "list" },
							{ value: "store", label: "店ごと", icon: "store" },
						]}
					/>
					<span style={row}>
						<Checkbox
							label="トマトをチェック"
							checked={checked}
							onChange={(event) => setChecked(event.target.checked)}
						/>
						<Checkbox label="使えない" disabled />
						<span>トマト（押せる範囲は 44px）</span>
					</span>
				</div>
			</Section>

			<Section
				title="トグル"
				description="すぐに効く設定の切り替え（「保存」を押す入力には、チェックボックス）。"
			>
				<div style={row}>
					<Toggle
						label="調理中は、画面を消さない"
						checked={toggled}
						onChange={setToggled}
					/>
					<Toggle
						label="使えない（切）"
						checked={false}
						disabled
						onChange={() => {}}
					/>
					<Toggle label="使えない（入）" checked disabled onChange={() => {}} />
				</div>
			</Section>

			<Section title="部品（第1弾）：お知らせ・カード・トースト">
				<div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
					<Note tone="info" spinning>
						在庫を同期しています…
					</Note>
					<Note
						tone="warn"
						action={
							<Button size="sm" variant="secondary">
								在庫同期を再試行
							</Button>
						}
					>
						未反映の在庫があります
					</Note>
					<Note tone="success">3件の在庫を反映しました</Note>
					<Note>通信できないため、保存済みの在庫を表示しています。</Note>
					<Note tone="error">在庫を読み込めませんでした</Note>
					<Card padding="md">カード（白い面。角丸 20px）</Card>
					<Toast action={{ label: "元に戻す", onClick: () => undefined }}>
						在庫から引きました
					</Toast>
				</div>
			</Section>
		</>
	);
}

// 「つくった」の結果の、見た目の確認用（偽のデータ。実物の部品を動かす）。
const consumeIngredients = [
	["ホケミ", 200, "g"],
	["卵", 2, "個"],
	["牛乳", 100, "ml"],
	["オリーブオイル", 10, "ml"],
	["粉チーズ", 10, "g"],
	["マヨネーズ", 20, "g"],
	["胡椒", null, null],
	["塩胡椒", null, null],
	["ベーコン", null, null],
	["たまねぎ", 1, "個"],
	["ほうれん草", 1, "束"],
	["パプリカ(赤)", null, null],
	["塩", 3, "g"],
].map(
	([name, quantity, unitLabel], index) =>
		({
			type: "ingredient",
			id: `gallery-${index}`,
			status: "parsed",
			rawText: String(name),
			name,
			amountText: quantity === null ? "少々" : `${quantity}${unitLabel}`,
			quantity,
			unitLabel,
		}) as unknown as RecipeEditorIngredientNode,
);

const consumeStock: InventoryListItem[] = [
	["ホケミ", 500, "g", "g", "exact"],
	["塩", 1, "個", "count", "presence"],
].map(([name, quantity, unitLabel, stockUnitCode, trackingMode]) => ({
	inventoryItemId: `gallery-stock-${name}`,
	ingredientId: `gallery-ingredient-${name}`,
	name: String(name),
	displayName: null,
	quantity: Number(quantity),
	capacity: Number(quantity),
	lots: [],
	stockUnitCode: stockUnitCode as InventoryListItem["stockUnitCode"],
	stockUnitLabel: String(unitLabel),
	trackingMode: trackingMode as InventoryListItem["trackingMode"],
	defaultExpiryKind: null,
	defaultStorage: null,
	updatedAt: "2026-09-23T00:00:00.000Z",
}));

const galleryStores = [
	{
		id: "aeon",
		name: "イオン",
		sortOrder: 0,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
	{
		id: "seiyu",
		name: "西友",
		sortOrder: 1,
		createdAt: "2026-10-01T00:00:00.000Z",
	},
];

// 条件つきのメモの、見た目の確認用（偽のデータ）。
function BranchGallery() {
	const [branch, setBranch] = useState<BranchCardView>({
		condition: "イオンに合い挽き肉 1パックが売っていたら",
		ifTrue: {
			label: "ハンバーグ",
			items: [
				{ id: "t1", name: "卵", amount: "10個" },
				{ id: "t2", name: "にんにくチューブ", amount: "1本" },
			],
		},
		ifFalse: {
			label: "生姜焼き",
			items: [
				{ id: "e1", name: "豚バラ肉", amount: "1パック" },
				{ id: "e2", name: "アボカド", amount: "1個" },
				{ id: "e3", name: "しょうが", amount: "1パック" },
			],
		},
	});
	const [isEditing, setIsEditing] = useState(false);
	const [message, setMessage] = useState("");
	const [value, setValue] = useState<BranchConditionValue>({
		storeId: "aeon",
		name: "合い挽き肉",
		quantity: "1",
		unitLabel: "パック",
		categoryId: "meat",
		isCategoryManual: false,
		presetConversion: null,
		condition: "売っていたら",
		thenLabel: "ハンバーグ",
		elseLabel: "生姜焼き",
	});

	function removeItem(side: BranchCardSide, itemId: string) {
		const key = side === "then" ? "ifTrue" : "ifFalse";

		setBranch({
			...branch,
			[key]: {
				...branch[key],
				items: branch[key].items.filter((item) => item.id !== itemId),
			},
		});
	}

	return (
		<Section
			title="条件つきのメモ"
			description="ふだんは1枚にたたむ。「中身を見る」でタブ、右上の「…」から条件を直す・削除。"
		>
			<div style={{ maxWidth: 480 }}>
				<ShoppingBranchCard
					branch={branch}
					onDecide={(side) =>
						setMessage(
							`「${side === "then" ? "そうだった" : "ちがった"}」を押しました`,
						)
					}
					onEdit={() => setIsEditing(true)}
					onRemove={() => setMessage("削除の確認を出します")}
					onRemoveItem={removeItem}
					onEditItem={() => setMessage("編集のシートを開きます")}
					onAdd={() => setMessage("追加のシートを開きます")}
					onBulkAdd={() => setMessage("まとめて追加を開きます")}
					onAddFromRecipe={() => setMessage("レシピから入れるを開きます")}
				/>
			</div>
			{message ? <p style={note}>{message}</p> : null}

			{isEditing ? (
				<ShoppingBranchConditionEditor
					value={value}
					stores={galleryStores}
					onCreateStore={async () => null}
					onCancel={() => setIsEditing(false)}
					onSave={async (next) => {
						await wait(1500);
						setValue(next);
						setIsEditing(false);

						return true;
					}}
				/>
			) : null}
		</Section>
	);
}

function SheetGallery() {
	const [single, setSingle] = useState(false);
	const [double, setDouble] = useState(false);
	const [panel, setPanel] = useState(false);
	const [floating, setFloating] = useState(false);
	const [cornerShort, setCornerShort] = useState(false);
	const [cornerLong, setCornerLong] = useState(false);
	const [cornerPending, setCornerPending] = useState(false);
	const [confirmDanger, setConfirmDanger] = useState(false);
	const [confirmPending, setConfirmPending] = useState(false);
	const [radio, setRadio] = useState<"max" | "sum" | "skip">("max");

	const longBody = (
		<div style={{ display: "grid", gap: 12 }}>
			{sampleRows.map((row) => (
				<Card key={row} padding="md">
					行 {row}
					（本文。先頭までスクロールしてから、下へ引くと、シートが下がります）
				</Card>
			))}
		</div>
	);

	return (
		<Section
			title="シート"
			description="スマホ幅（またはブラウザの開発者ツールのスマホ表示）で、指で、つかんで・本文から引いて、試す。勢い（はじく）・ゴムの抵抗・止まる位置への吸い付き・Esc・暗幕。"
		>
			<div style={row}>
				<Button variant="secondary" onClick={() => setSingle(true)}>
					1段（92%）
				</Button>
				<Button variant="secondary" onClick={() => setDouble(true)}>
					2段（62% ⇄ 92%）
				</Button>
				<Button variant="secondary" onClick={() => setPanel(true)}>
					右のパネル（PC）
				</Button>
				<Button variant="secondary" onClick={() => setFloating(true)}>
					浮いたパネル（暗幕なし）
				</Button>
				<Button variant="secondary" onClick={() => setCornerShort(true)}>
					上のシート＋角のボタン（短い）
				</Button>
				<Button variant="secondary" onClick={() => setCornerLong(true)}>
					上のシート＋角のボタン（長い）
				</Button>
				<Button variant="secondary" onClick={() => setConfirmDanger(true)}>
					確認ダイアログ（削除）
				</Button>
			</div>

			<RecipeConsumeSection
				recipePublicId="gallery-recipe"
				ingredients={consumeIngredients}
				ownerScope="user:gallery"
				loadInventoryItems={async () => consumeStock}
				consume={async (operation) =>
					operation.entries.map((entry) => ({
						needId: entry.needId,
						ok: true as const,
					}))
				}
				undo={async () => ({
					status: "undone" as const,
					items: [],
					unreturnedProduction: 0,
				})}
			/>

			<ConfirmDialog
				open={confirmDanger}
				title="購入済みをすべて削除しますか？"
				cancelLabel="やめる"
				confirmLabel="すべて削除する"
				danger
				pending={confirmPending}
				onCancel={() => setConfirmDanger(false)}
				onConfirm={() => {
					setConfirmPending(true);
					void wait(3000).then(() => {
						setConfirmPending(false);
						setConfirmDanger(false);
					});
				}}
			>
				購入済みの3件を、買い物メモから削除します。在庫には影響しません。
			</ConfirmDialog>

			<CornerSheet
				open={cornerShort}
				onDismiss={() => setCornerShort(false)}
				title="在庫から3件を引きました"
				left={{
					label: "元に戻す",
					icon: "undo",
					pending: cornerPending,
					onClick: () => {
						setCornerPending(true);
						void wait(3000).then(() => {
							setCornerPending(false);
							setCornerShort(false);
						});
					},
				}}
				right={{
					label: "閉じる",
					icon: "check",
					onClick: () => setCornerShort(false),
				}}
			>
				<ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
					{[
						"玉ねぎ：1個を引きました",
						"鶏むね肉：250gを引きました",
						"しょうゆ：在庫にないため、引いていません",
					].map((line) => (
						<li
							key={line}
							style={{
								padding: "12px 0",
								borderBottom: "1px solid var(--color-border)",
								fontSize: 14,
							}}
						>
							{line}
						</li>
					))}
				</ul>
			</CornerSheet>

			<CornerSheet
				open={cornerLong}
				onDismiss={() => setCornerLong(false)}
				title="在庫から24件を引きました"
				left={{
					label: "元に戻す",
					icon: "undo",
					onClick: () => setCornerLong(false),
				}}
				right={{
					label: "閉じる",
					icon: "check",
					onClick: () => setCornerLong(false),
				}}
			>
				{longBody}
			</CornerSheet>

			<RadioList
				legend="メモに同じものがあるとき"
				name="gallery-radio"
				value={radio}
				onChange={setRadio}
				options={[
					{ value: "max", label: "多い方に合わせる" },
					{ value: "sum", label: "合算する" },
					{ value: "skip", label: "追加しない" },
				]}
			/>

			<Sheet
				open={floating}
				onOpenChange={setFloating}
				title="在庫に追加（浮いたパネル）"
				modal={false}
				snapPoints={[0.6, 0.92]}
				footer={<Button size="lg">追加</Button>}
			>
				{longBody}
			</Sheet>

			<Sheet
				open={single}
				onOpenChange={setSingle}
				title="在庫に追加"
				snapPoints={snapPointsOne}
				footer={
					<>
						<Button
							variant="secondary"
							size="lg"
							onClick={() => setSingle(false)}
						>
							キャンセル
						</Button>
						<Button size="lg">在庫に追加</Button>
					</>
				}
			>
				{longBody}
			</Sheet>

			<Sheet
				open={double}
				onOpenChange={setDouble}
				title="鶏むね肉"
				snapPoints={snapPointsTwo}
			>
				{longBody}
			</Sheet>

			<Sheet
				open={panel}
				onOpenChange={setPanel}
				title="在庫に追加"
				placement="right"
				footer={<Button size="lg">在庫に追加</Button>}
			>
				{longBody}
			</Sheet>
		</Section>
	);
}
