import { useEffect, useRef, useState } from "react";
import { Icon } from "#/components/icon/icon";
import { MASCOT_DISPLAY_NAME } from "#/config/app";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
} from "#/features/inventory/domain/inventory-fridge";
import { InteriorPanel } from "./interior-panel";
import { ItemArtAt, PartAt } from "./item-art";
import { Pet, type PetMood } from "./parts";
import {
	compareByExpiry,
	describeExpiry,
	type SampleItem,
} from "./sample-data";
import * as styles from "./scene.css";
import { type Point, useHopWalker } from "./use-hop-walker";

const INK = "var(--color-text)";
const STROKE = 2.5;

type Props = {
	items: readonly SampleItem[];
	night: boolean;
	// れしぽよを出すか（本番では、設定のトグル）。
	petVisible: boolean;
	selectedId: string | null;
	onSelect: (item: SampleItem) => void;
};

type Target = "fridge" | "table";
type OpenPart = "top" | "veg" | "freezer" | null;
type Spot = Point & { mood: PetMood };

// ふだんのしぐさ（巡回）。夜は、クッションで寝たまま。
const spots: Spot[] = [
	{ x: 14, y: 64, mood: "idle" },
	{ x: 52, y: 67, mood: "look" },
	{ x: 36, y: 79, mood: "idle" },
	{ x: 75, y: 92.5, mood: "sleep" },
];
const cushionIndex = 3;

const camera: Record<
	Target,
	{ cx: number; cy: number; zoom: number; aim: number }
> = {
	fridge: { cx: 76.5, cy: 36.7, zoom: 2.05, aim: 46 },
	table: { cx: 35, cy: 79, zoom: 1.75, aim: 58 },
};

const tableSlots = [
	{ x: 84, y: 486 },
	{ x: 124, y: 480 },
	{ x: 164, y: 480 },
	{ x: 204, y: 486 },
	{ x: 104, y: 512 },
	{ x: 178, y: 514 },
];

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
	return (
		<g transform={`translate(${x} ${y}) scale(${scale})`}>
			<path
				d="M0 0C-26 -20 -28 -54 -10 -70C-4 -40 4 -22 0 0Z"
				fill="#6fb77a"
				stroke={INK}
				strokeWidth={STROKE}
				strokeLinejoin="round"
			/>
			<path
				d="M0 0C24 -16 34 -48 22 -68C10 -44 0 -26 0 0Z"
				fill="#58ad6e"
				stroke={INK}
				strokeWidth={STROKE}
				strokeLinejoin="round"
			/>
			<path
				d="M0 0C-4 -28 4 -58 2 -84C16 -58 12 -26 0 0Z"
				fill="#8bcb92"
				stroke={INK}
				strokeWidth={STROKE}
				strokeLinejoin="round"
			/>
			<path
				d="M-18 0H18L14 30H-14Z"
				fill="#d98b5f"
				stroke={INK}
				strokeWidth={STROKE}
				strokeLinejoin="round"
			/>
		</g>
	);
}

// 部屋の絵。奥に壁・窓・冷蔵庫、手前に丸いテーブル。座標は 400×640。
function RoomArt({
	night,
	open,
	tableItems,
}: {
	night: boolean;
	open: OpenPart;
	tableItems: readonly SampleItem[];
}) {
	return (
		<svg
			className={styles.art}
			viewBox="0 0 400 640"
			role="img"
			aria-label="おうちの部屋。奥に冷蔵庫、手前に丸いテーブル"
		>
			<defs>
				<radialGradient
					id="lampGlow"
					cx="170"
					cy="70"
					r="260"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0" stopColor="#ffe29a" stopOpacity="0.85" />
					<stop offset="1" stopColor="#ffe29a" stopOpacity="0" />
				</radialGradient>
				<radialGradient
					id="duskShade"
					cx="170"
					cy="120"
					r="420"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0.15" stopColor="#2b2350" stopOpacity="0" />
					<stop offset="1" stopColor="#2b2350" stopOpacity="0.62" />
				</radialGradient>
			</defs>

			{/* 壁と床 */}
			<rect width="400" height="400" fill="#f6dfae" />
			<rect y="300" width="400" height="100" fill="#efd29a" />
			<path d="M0 300H400" stroke="#d9b676" strokeWidth="3" />
			<rect y="400" width="400" height="240" fill="#d9a766" />
			{[0, 80, 160, 240, 320, 400].map((x) => (
				<path
					key={x}
					d={`M${x} 400L${200 + (x - 200) * 3.4} 640`}
					stroke="#c4914f"
					strokeWidth="2"
				/>
			))}
			<path d="M0 400H400" stroke={INK} strokeWidth={STROKE} />

			{/* 窓 */}
			<g>
				<rect x="28" y="108" width="112" height="124" rx="10" fill="#cfeaf7" />
				<rect
					className={styles.fade}
					x="28"
					y="108"
					width="112"
					height="124"
					rx="10"
					fill="#3a3f73"
					style={{ opacity: night ? 1 : 0 }}
				/>
				<circle
					className={styles.fade}
					cx="112"
					cy="136"
					r="9"
					fill="#fff6c8"
					style={{ opacity: night ? 1 : 0 }}
				/>
				<rect
					x="28"
					y="108"
					width="112"
					height="124"
					rx="10"
					fill="none"
					stroke={INK}
					strokeWidth="3"
				/>
				<path d="M84 108V232M28 170H140" stroke={INK} strokeWidth="3" />
				<path
					d="M20 100H148"
					stroke={INK}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<path
					d="M30 104Q44 150 34 230H20Q22 160 30 104Z"
					fill="#f3b9a3"
					stroke={INK}
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
				<path
					d="M138 104Q124 150 134 230H148Q146 160 138 104Z"
					fill="#f3b9a3"
					stroke={INK}
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
				<rect
					x="24"
					y="232"
					width="120"
					height="8"
					rx="3"
					fill="#c98f58"
					stroke={INK}
					strokeWidth="2.5"
				/>
			</g>
			<Plant x={90} y={228} scale={0.5} />

			{/* 床の観葉植物 */}
			<Plant x={36} y={372} scale={0.95} />

			{/* 冷蔵庫（奥・右） */}
			<g>
				<rect
					x="226"
					y="66"
					width="156"
					height="338"
					rx="16"
					fill="#fffdf7"
					stroke={INK}
					strokeWidth="3"
				/>
				{/* 開けたときの庫内（上の扉の奥） */}
				<rect
					x="236"
					y="76"
					width="136"
					height="164"
					rx="8"
					fill="#fff6d4"
					stroke={INK}
					strokeWidth="2.5"
				/>
				{[130, 176, 222].map((y) => (
					<path
						key={y}
						d={`M240 ${y}H368`}
						stroke="#bfb08a"
						strokeWidth="4"
						strokeLinecap="round"
					/>
				))}
				<PartAt partId="raw-egg" x={262} y={128} size={32} />
				<PartAt partId="tofu" x={300} y={128} size={32} />
				<PartAt partId="cheese" x={338} y={128} size={30} />
				<PartAt partId="natto" x={262} y={174} size={32} />
				<PartAt partId="glass" x={300} y={174} size={34} />
				<PartAt partId="sausage" x={340} y={174} size={30} />
				<PartAt partId="fish-fillet" x={274} y={220} size={34} />
				<PartAt partId="sauce" x={332} y={220} size={30} />

				{/* 野菜室（引き出し。奥に中身） */}
				<rect
					x="234"
					y="248"
					width="140"
					height="74"
					rx="10"
					fill="#e9dfc4"
					stroke={INK}
					strokeWidth="3"
				/>
				<PartAt partId="cabbage" x={262} y={284} size={36} />
				<PartAt partId="carrot" x={300} y={284} size={34} />
				<PartAt partId="tomato" x={338} y={284} size={34} />
				{/* 冷凍室（引き出し。奥に中身） */}
				<rect
					x="234"
					y="328"
					width="140"
					height="68"
					rx="10"
					fill="#dfe8ee"
					stroke={INK}
					strokeWidth="3"
				/>
				<PartAt partId="gyoza" x={262} y={364} size={36} />
				<PartAt partId="takoyaki" x={300} y={364} size={34} />
				<PartAt partId="shokupan" x={338} y={364} size={34} />

				{/* 上の扉（冷蔵室・ドアポケット）：ちょうつがいは左 */}
				<g className={styles.fridgeDoor} data-open={open === "top"}>
					<rect
						x="234"
						y="74"
						width="140"
						height="168"
						rx="10"
						fill="#fffdf7"
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="354"
						y="104"
						width="8"
						height="50"
						rx="4"
						fill="#d9d2bf"
						stroke={INK}
						strokeWidth="2.5"
					/>
					{/* 貼り紙とマグネット */}
					<rect
						x="262"
						y="90"
						width="40"
						height="46"
						rx="3"
						fill="#fff3c4"
						stroke={INK}
						strokeWidth="2.5"
						transform="rotate(-4 282 113)"
					/>
					<path
						d="M270 104H294M270 114H290M270 124H284"
						stroke={INK}
						strokeWidth="2"
						strokeLinecap="round"
						transform="rotate(-4 282 113)"
					/>
					<circle
						cx="282"
						cy="91"
						r="5"
						fill="#e04b3e"
						stroke={INK}
						strokeWidth="2"
					/>
					{/* ドアポケット（調味料などを立てる棚） */}
					<path
						d="M242 204H366V234Q366 238 362 238H246Q242 238 242 234Z"
						fill="#f2ead2"
						stroke={INK}
						strokeWidth="2.5"
						strokeLinejoin="round"
					/>
					<rect
						x="252"
						y="184"
						width="14"
						height="24"
						rx="4"
						fill="#d98b5f"
						stroke={INK}
						strokeWidth="2"
					/>
					<rect
						x="270"
						y="190"
						width="12"
						height="18"
						rx="3"
						fill="#e9a900"
						stroke={INK}
						strokeWidth="2"
					/>
					<rect
						x="286"
						y="186"
						width="14"
						height="22"
						rx="4"
						fill="#6fb77a"
						stroke={INK}
						strokeWidth="2"
					/>
					<rect
						x="304"
						y="192"
						width="12"
						height="16"
						rx="3"
						fill="#e04b3e"
						stroke={INK}
						strokeWidth="2"
					/>
				</g>

				{/* 野菜室・冷凍室の前板（ひらくと、手前に出て、中身が見える） */}
				<g className={styles.drawer} data-open={open === "veg"}>
					<rect
						x="234"
						y="248"
						width="140"
						height="74"
						rx="10"
						fill="#fffdf7"
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="276"
						y="258"
						width="56"
						height="8"
						rx="4"
						fill="#d9d2bf"
						stroke={INK}
						strokeWidth="2.5"
					/>
				</g>
				<g className={styles.drawer} data-open={open === "freezer"}>
					<rect
						x="234"
						y="328"
						width="140"
						height="68"
						rx="10"
						fill="#fffdf7"
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="276"
						y="338"
						width="56"
						height="8"
						rx="4"
						fill="#d9d2bf"
						stroke={INK}
						strokeWidth="2.5"
					/>
				</g>
				<rect x="244" y="404" width="22" height="8" rx="3" fill={INK} />
				<rect x="342" y="404" width="22" height="8" rx="3" fill={INK} />
			</g>

			{/* クッション（れしぽよの寝床） */}
			<g>
				<ellipse
					cx="300"
					cy="596"
					rx="54"
					ry="15"
					fill="#f3b9a3"
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<ellipse cx="300" cy="591" rx="38" ry="8" fill="#f8d2c2" />
			</g>

			{/* 丸いテーブル（手前） */}
			<g>
				<ellipse
					cx="140"
					cy="612"
					rx="58"
					ry="13"
					fill="#b98250"
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<path
					d="M124 534H156L162 604H118Z"
					fill="#c4915a"
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<path
					d="M20 506V520Q20 548 140 548Q260 548 260 520V506Z"
					fill="#c4915a"
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<ellipse
					cx="140"
					cy="502"
					rx="120"
					ry="40"
					fill="#e6b676"
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<ellipse
					cx="140"
					cy="498"
					rx="96"
					ry="28"
					fill="none"
					stroke="#cf9b5a"
					strokeWidth="2"
				/>
			</g>
			{tableItems.slice(0, tableSlots.length).map((item, index) => {
				const slot = tableSlots[index];

				return slot ? (
					<ItemArtAt
						key={item.id}
						item={item}
						x={slot.x}
						y={slot.y}
						size={40}
					/>
				) : null;
			})}

			{/* 天井のランプ */}
			<g>
				<path d="M170 0V40" stroke={INK} strokeWidth="3" />
				<path
					d="M146 66L156 40H184L194 66Z"
					fill="#e9a900"
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<ellipse
					cx="170"
					cy="68"
					rx="14"
					ry="6"
					fill="#fff6c8"
					stroke={INK}
					strokeWidth="2"
				/>
			</g>

			{/* 光と夕方の暗さ */}
			<rect
				className={styles.fade}
				width="400"
				height="640"
				fill="url(#lampGlow)"
				style={{ opacity: night ? 0.9 : 0.35 }}
				pointerEvents="none"
			/>
			<rect
				className={styles.fade}
				width="400"
				height="640"
				fill="url(#duskShade)"
				style={{ opacity: night ? 1 : 0 }}
				pointerEvents="none"
			/>
		</svg>
	);
}

function count(
	items: readonly SampleItem[],
	zones: readonly InventoryZoneId[],
) {
	return items.filter((item) => zones.includes(item.zone)).length;
}

function alertCount(
	items: readonly SampleItem[],
	zones: readonly InventoryZoneId[],
) {
	return items.filter(
		(item) => zones.includes(item.zone) && describeExpiry(item) !== null,
	).length;
}

type HitSpec = {
	id: string;
	label: string;
	icon:
		| "zone-fridge"
		| "zone-door"
		| "zone-vegetable"
		| "zone-freezer"
		| "zone-table";
	zones: InventoryZoneId[];
	target: Target;
	zone: InventoryZoneId;
	// 絵の座標（400×640）での位置。
	box: { x: number; y: number; w: number; h: number };
	tagAlign: "start" | "center";
	// 開く部位（絵）。
	opens: OpenPart;
};

const hits: HitSpec[] = [
	{
		id: "fridge",
		label: "冷蔵室",
		icon: "zone-fridge",
		zones: ["fridge"],
		target: "fridge",
		zone: "fridge",
		box: { x: 234, y: 74, w: 140, h: 126 },
		tagAlign: "start",
		opens: "top",
	},
	{
		id: "pocket",
		label: "ドアポケット",
		icon: "zone-door",
		zones: ["door"],
		target: "fridge",
		zone: "door",
		box: { x: 234, y: 204, w: 140, h: 38 },
		tagAlign: "start",
		opens: "top",
	},
	{
		id: "vegetable",
		label: "野菜室",
		icon: "zone-vegetable",
		zones: ["vegetable"],
		target: "fridge",
		zone: "vegetable",
		box: { x: 234, y: 248, w: 140, h: 74 },
		tagAlign: "start",
		opens: "veg",
	},
	{
		id: "freezer",
		label: "冷凍室",
		icon: "zone-freezer",
		zones: ["freezer"],
		target: "fridge",
		zone: "freezer",
		box: { x: 234, y: 328, w: 140, h: 68 },
		tagAlign: "start",
		opens: "freezer",
	},
	{
		id: "table",
		label: "机の上",
		icon: "zone-table",
		zones: ["table"],
		target: "table",
		zone: "table",
		box: { x: 20, y: 456, w: 240, h: 100 },
		tagAlign: "center",
		opens: null,
	},
];

const fridgeZones: InventoryZoneId[] = [
	"fridge",
	"vegetable",
	"freezer",
	"door",
];

// A案（作り直し）：画面全体が部屋。奥に冷蔵庫、手前に丸いテーブル。押すとズームして、中が見える。
export function SceneView({
	items,
	night,
	petVisible,
	selectedId,
	onSelect,
}: Props) {
	const [target, setTarget] = useState<Target | null>(null);
	const [opened, setOpened] = useState(false);
	const [openPart, setOpenPart] = useState<OpenPart>(null);
	const [inside, setInside] = useState(false);
	const [zone, setZone] = useState<InventoryZoneId>("fridge");
	const timers = useRef<number[]>([]);

	const [spotIndex, setSpotIndex] = useState(0);
	const [arrivedAt, setArrivedAt] = useState<Spot | null>(null);
	const [cheer, setCheer] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const hopRef = useRef<HTMLSpanElement>(null);

	const zoomed = target !== null;

	const spot = spots[night ? cushionIndex : spotIndex] ?? spots[0];
	const startSpot = spots[0] ?? { x: 14, y: 64, mood: "idle" as const };
	const arrived = arrivedAt !== null && arrivedAt === spot;

	useHopWalker({
		buttonRef,
		hopRef,
		target: spot ?? startSpot,
		active: !zoomed,
		start: startSpot,
		onArrive: () => setArrivedAt(spot ?? startSpot),
	});

	useEffect(() => {
		if (!arrived || zoomed || night) {
			return;
		}

		const dwell = spotIndex === cushionIndex ? 24000 : 14000;
		const timer = window.setTimeout(() => {
			setSpotIndex((value) => (value + 1) % spots.length);
		}, dwell);

		return () => window.clearTimeout(timer);
	}, [arrived, zoomed, night, spotIndex]);

	useEffect(
		() => () => {
			for (const timer of timers.current) {
				window.clearTimeout(timer);
			}
		},
		[],
	);

	const later = (run: () => void, ms: number) => {
		timers.current.push(window.setTimeout(run, ms));
	};

	const enter = (spec: HitSpec) => {
		for (const timer of timers.current) {
			window.clearTimeout(timer);
		}
		timers.current = [];
		setZone(spec.zone);
		setOpenPart(spec.opens);
		setTarget(spec.target);
		later(() => setOpened(true), 760);
		later(() => setInside(true), 1180);
	};

	const leave = () => {
		for (const timer of timers.current) {
			window.clearTimeout(timer);
		}
		timers.current = [];
		setInside(false);
		later(() => setOpened(false), 200);
		later(() => setTarget(null), 420);
	};

	const urgent = [...items]
		.filter((item) => describeExpiry(item) !== null)
		.sort(compareByExpiry);
	const first = urgent[0];
	const firstExpiry = first ? describeExpiry(first) : null;
	const message = night
		? "すやすや…"
		: first && firstExpiry
			? `「${first.name}」が${firstExpiry.text === "切れ" ? "切れているよ" : `${firstExpiry.text}までだよ`}${urgent.length > 1 ? `（ほか${urgent.length - 1}件）` : ""}`
			: "きょうは、期限の近いものはないよ";

	const mood: PetMood = cheer
		? "cheer"
		: arrived
			? (spot?.mood ?? "idle")
			: "walk";
	const view = target ? camera[target] : null;
	const tableItems = items.filter((item) => item.zone === "table");

	return (
		<div style={{ display: "grid", gap: 8 }}>
			<section
				className={styles.frame}
				aria-label={`${MASCOT_DISPLAY_NAME}のおうち`}
			>
				<p className={styles.bubble} data-hidden={zoomed || !petVisible}>
					<strong>{MASCOT_DISPLAY_NAME}</strong>：{message}
				</p>

				<div
					className={styles.camera}
					style={
						view
							? ({
									"--cx": view.cx,
									"--cy": view.cy,
									"--zoom": view.zoom,
									"--aim": view.aim,
								} as React.CSSProperties)
							: undefined
					}
				>
					<RoomArt
						night={night}
						open={opened ? openPart : null}
						tableItems={tableItems}
					/>

					{hits.map((spec) => {
						const total = count(items, spec.zones);
						const alerts = alertCount(items, spec.zones);

						return (
							<button
								className={styles.hit}
								type="button"
								key={spec.id}
								data-hidden={zoomed}
								tabIndex={zoomed ? -1 : 0}
								aria-label={`${spec.label}をひらく（${total}件${alerts ? `、期限が近いもの${alerts}件` : ""}）`}
								style={{
									left: `${(spec.box.x / 400) * 100}%`,
									top: `${(spec.box.y / 640) * 100}%`,
									width: `${(spec.box.w / 400) * 100}%`,
									height: `${(spec.box.h / 640) * 100}%`,
									justifyContent:
										spec.tagAlign === "center" ? "center" : "flex-start",
									alignItems: spec.id === "table" ? "flex-end" : "flex-end",
								}}
								onClick={() => enter(spec)}
							>
								<span className={styles.tag} aria-hidden>
									<Icon name={spec.icon} size={16} />
									{spec.label} {total}
									{alerts > 0 ? (
										<span className={styles.alert}>{alerts}</span>
									) : null}
								</span>
							</button>
						);
					})}

					{zoomed || !petVisible ? null : (
						<Pet
							mood={mood}
							buttonRef={buttonRef}
							hopRef={hopRef}
							onPoke={() => {
								setCheer(true);
								window.setTimeout(() => setCheer(false), 1500);
							}}
						/>
					)}
				</div>

				{inside && target ? (
					<InteriorPanel
						zones={target === "fridge" ? fridgeZones : ["table"]}
						zone={zone}
						onZoneChange={setZone}
						items={items}
						night={night}
						petVisible={petVisible}
						selectedId={selectedId}
						onSelect={onSelect}
						onBack={leave}
					/>
				) : null}
			</section>
			<p
				style={{
					margin: 0,
					fontSize: 12,
					textAlign: "center",
					color: "var(--color-text-muted)",
				}}
			>
				冷蔵庫の扉・引き出し、テーブルを押すと、ズームして中が見えます。れしぽよもつつけます。
			</p>
		</div>
	);
}

export { inventoryZoneLabels };
