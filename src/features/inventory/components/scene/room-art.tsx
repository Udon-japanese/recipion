import type { InventoryTile } from "../../domain/inventory-fridge";
import { PartAt, TileArtAt } from "./art-at";
import * as styles from "./scene.css";

const INK = "var(--color-text)";
const STROKE = 2.5;
// 内側の細い線（輪郭より細く、薄く。線に強弱を付ける）。
const DETAIL = 1.5;
const DETAIL_OPACITY = 0.45;

export type OpenPart = "top" | "veg" | "freezer" | null;

// 昼と夜の色。夜は、絵全体に暗い色を重ねず、物ごとに夜の色で塗る（重ねると、色が濁る）。
const dayColors = {
	wall: "#f6dfae",
	wainscot: "#efd29a",
	wainscotLine: "#d9b676",
	floor: "#d9a766",
	floorLine: "#c4914f",
	fabric: "#f3b9a3",
	fabricLight: "#f8d2c2",
	wood: "#c98f58",
	fridge: "#fffdf7",
	fridgeInside: "#fff6d4",
	shelf: "#bfb08a",
	freezer: "#dfe8ee",
	vegetable: "#e9dfc4",
	handle: "#d9d2bf",
	note: "#fff3c4",
	pocket: "#f2ead2",
	tableFoot: "#b98250",
	tableSide: "#c4915a",
	tableTop: "#e6b676",
	tableRim: "#cf9b5a",
	leafDark: "#58ad6e",
	leaf: "#6fb77a",
	leafLight: "#8bcb92",
	pot: "#d98b5f",
	soil: "#6b4a35",
	rug: "#e9cfa3",
	rugBorder: "#c98f58",
	clock: "#fffdf7",
	// 床に落ちる影の濃さ。
	shadow: 0.14,
};

type RoomColors = typeof dayColors;

const nightColors: RoomColors = {
	wall: "#5a5f8c",
	wainscot: "#50547e",
	wainscotLine: "#444872",
	floor: "#7d6058",
	floorLine: "#6c5049",
	fabric: "#c98f8a",
	fabricLight: "#d9a8a0",
	wood: "#946a4e",
	fridge: "#dfe1ee",
	fridgeInside: "#f3ead0",
	shelf: "#a49c88",
	freezer: "#bcc6da",
	vegetable: "#c9c1ad",
	handle: "#aeadc0",
	note: "#e9ddb4",
	pocket: "#d4cfc4",
	tableFoot: "#8c6044",
	tableSide: "#a0744c",
	tableTop: "#d1a06a",
	tableRim: "#b48352",
	leafDark: "#3f7f5c",
	leaf: "#4f9168",
	leafLight: "#69a87c",
	pot: "#b06f55",
	soil: "#4a3428",
	rug: "#b49a86",
	rugBorder: "#8f6a52",
	clock: "#dfe1ee",
	shadow: 0.28,
};

// テーブルの上に置く食材の足もと（奥の4つ、手前の2つ）。
const tableSlots = [
	{ x: 70, y: 496 },
	{ x: 116, y: 492 },
	{ x: 164, y: 492 },
	{ x: 210, y: 496 },
	{ x: 100, y: 524 },
	{ x: 180, y: 524 },
];
const TABLE_ART_SIZE = 60;

// 観葉植物：葉は、輪郭を太く、葉脈を細く。鉢には、縁と土。
function Plant({
	x,
	y,
	scale = 1,
	c,
}: {
	x: number;
	y: number;
	scale?: number;
	c: RoomColors;
}) {
	const leaves = [
		{
			d: "M0 0C-30 -14 -40 -48 -26 -72C-14 -46 -4 -24 0 0Z",
			vein: "M0 0Q-14 -30 -24 -66",
			fill: c.leaf,
		},
		{
			d: "M0 0C28 -12 42 -44 32 -70C16 -46 4 -24 0 0Z",
			vein: "M0 0Q14 -30 30 -64",
			fill: c.leafDark,
		},
		{
			d: "M0 0C-12 -10 -22 -30 -18 -46C-8 -30 -2 -16 0 0Z",
			vein: "M0 0Q-8 -20 -16 -42",
			fill: c.leafDark,
		},
		{
			d: "M0 0C-8 -30 -2 -64 6 -90C18 -62 12 -28 0 0Z",
			vein: "M0 0Q4 -44 6 -84",
			fill: c.leafLight,
		},
	];

	return (
		<g transform={`translate(${x} ${y}) scale(${scale})`}>
			{leaves.map((leaf) => (
				<g key={leaf.d}>
					<path
						d={leaf.d}
						fill={leaf.fill}
						stroke={INK}
						strokeWidth={STROKE}
						strokeLinejoin="round"
					/>
					<path
						d={leaf.vein}
						fill="none"
						stroke={INK}
						strokeWidth={DETAIL}
						strokeLinecap="round"
						opacity={DETAIL_OPACITY}
					/>
				</g>
			))}
			<ellipse cx="0" cy="2" rx="17" ry="3.5" fill={c.soil} />
			<path
				d="M-17 6H17L13 32Q13 34 11 34H-11Q-13 34 -13 32Z"
				fill={c.pot}
				stroke={INK}
				strokeWidth={STROKE}
				strokeLinejoin="round"
			/>
			<rect
				x="-21"
				y="-1"
				width="42"
				height="9"
				rx="3"
				fill={c.pot}
				stroke={INK}
				strokeWidth={STROKE}
			/>
		</g>
	);
}

// 部屋の絵。奥に壁・窓・冷蔵庫、手前に丸いテーブル。座標は、中央が 400×640、左右に200ずつの余白。
export function RoomArt({
	night,
	open,
	tableTiles,
}: {
	night: boolean;
	open: OpenPart;
	tableTiles: readonly InventoryTile[];
}) {
	const c = night ? nightColors : dayColors;

	return (
		<svg
			className={styles.art}
			viewBox="-200 0 800 640"
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
					id="tableLight"
					cx="140"
					cy="510"
					r="190"
					gradientTransform="translate(0 340) scale(1 0.34)"
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
					<stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
				</radialGradient>
			</defs>

			{/* 壁と床 */}
			<rect x="-200" width="800" height="400" fill={c.wall} />
			<rect x="-200" y="300" width="800" height="100" fill={c.wainscot} />
			<path d="M-200 300H600" stroke={c.wainscotLine} strokeWidth="3" />
			<rect x="-200" y="400" width="800" height="240" fill={c.floor} />
			{[-200, -120, -40, 40, 120, 200, 280, 360, 440, 520, 600].map((x) => (
				<path
					key={x}
					d={`M${x} 400L${200 + (x - 200) * 3.4} 640`}
					stroke={c.floorLine}
					strokeWidth="2"
				/>
			))}
			<path d="M-200 400H600" stroke={INK} strokeWidth={STROKE} />

			{/* ランプの光：壁と床だけを照らす（物の線の上に重ねると、線が濁る）。夜は、テーブルのあたりの床も */}
			<rect
				className={styles.fade}
				x="-200"
				width="800"
				height="640"
				fill="url(#lampGlow)"
				style={{ opacity: night ? 0.75 : 0.35 }}
				pointerEvents="none"
			/>
			<rect
				className={styles.fade}
				x="-200"
				width="800"
				height="640"
				fill="url(#tableLight)"
				style={{ opacity: night ? 1 : 0 }}
				pointerEvents="none"
			/>

			{/* 窓：ガラス（昼の光り・夜の月）、桟、カーテン（ひだ・留め帯）、窓台 */}
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
				<path
					className={styles.fade}
					d="M44 150L66 124M48 162L60 148M98 210L120 186"
					stroke="#ffffff"
					strokeWidth="3"
					strokeLinecap="round"
					style={{ opacity: night ? 0 : 0.8 }}
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
				<rect
					x="33"
					y="113"
					width="102"
					height="114"
					rx="7"
					fill="none"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
				<path d="M84 108V232M28 170H140" stroke={INK} strokeWidth={STROKE} />
				<path
					d="M20 100H148"
					stroke={INK}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<circle cx="20" cy="100" r="4" fill={INK} />
				<circle cx="148" cy="100" r="4" fill={INK} />
				<path
					d="M28 104Q46 140 40 176Q36 206 32 230H20Q24 160 28 104Z"
					fill={c.fabric}
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<path
					d="M140 104Q122 140 128 176Q132 206 136 230H148Q144 160 140 104Z"
					fill={c.fabric}
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<path
					d="M30 118Q36 150 30 222M140 118Q134 150 140 222"
					fill="none"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
				<path
					d="M21 172H40M127 172H147"
					stroke={c.wood}
					strokeWidth="5"
					strokeLinecap="round"
				/>
				<rect
					x="22"
					y="230"
					width="124"
					height="9"
					rx="3"
					fill={c.wood}
					stroke={INK}
					strokeWidth={STROKE}
				/>
			</g>

			{/* 壁の時計 */}
			<g>
				<circle
					cx="196"
					cy="182"
					r="17"
					fill={c.clock}
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<path
					d="M196 168V171M196 193V196M182 182H185M207 182H210"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
				<path
					d="M196 182V173M196 182L203 186"
					stroke={INK}
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</g>
			<Plant x={90} y={213} scale={0.5} c={c} />

			{/* テーブルの下の、丸いラグ */}
			<g>
				<ellipse
					cx="150"
					cy="606"
					rx="178"
					ry="34"
					fill={c.rug}
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<ellipse
					cx="150"
					cy="606"
					rx="160"
					ry="26"
					fill="none"
					stroke={c.rugBorder}
					strokeWidth="3"
					strokeDasharray="10 6"
				/>
			</g>

			{/* 床に落ちる影（物が、床に立って見えるように） */}
			<g fill={INK} opacity={c.shadow}>
				<ellipse cx="36" cy="402" rx="30" ry="6" />
				<ellipse cx="304" cy="412" rx="92" ry="9" />
				<ellipse cx="300" cy="606" rx="62" ry="9" />
				<ellipse cx="140" cy="620" rx="84" ry="12" />
			</g>

			{/* 床の観葉植物 */}
			<Plant x={36} y={372} scale={0.95} c={c} />

			{/* 冷蔵庫（奥・右） */}
			<g>
				<rect
					x="226"
					y="66"
					width="156"
					height="338"
					rx="16"
					fill={c.fridge}
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
					fill={c.fridgeInside}
					stroke={INK}
					strokeWidth="2.5"
				/>
				{[130, 176, 222].map((y) => (
					<path
						key={y}
						d={`M240 ${y}H368`}
						stroke={c.shelf}
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

				{/* 冷凍室（引き出し。奥に中身） */}
				<rect
					x="234"
					y="248"
					width="140"
					height="68"
					rx="10"
					fill={c.freezer}
					stroke={INK}
					strokeWidth="3"
				/>
				<PartAt partId="gyoza" x={262} y={284} size={36} />
				<PartAt partId="takoyaki" x={300} y={284} size={34} />
				<PartAt partId="shokupan" x={338} y={284} size={34} />
				{/* 野菜室（一番下。引き出し。奥に中身） */}
				<rect
					x="234"
					y="322"
					width="140"
					height="74"
					rx="10"
					fill={c.vegetable}
					stroke={INK}
					strokeWidth="3"
				/>
				<PartAt partId="cabbage" x={262} y={358} size={36} />
				<PartAt partId="carrot" x={300} y={358} size={34} />
				<PartAt partId="tomato" x={338} y={358} size={34} />

				{/* 上の扉（冷蔵室・ドアポケット）：ちょうつがいは左 */}
				<g className={styles.fridgeDoor} data-open={open === "top"}>
					<rect
						x="234"
						y="74"
						width="140"
						height="168"
						rx="10"
						fill={c.fridge}
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="354"
						y="104"
						width="8"
						height="50"
						rx="4"
						fill={c.handle}
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
						fill={c.note}
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
						fill={c.pocket}
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
				<g className={styles.drawer} data-open={open === "freezer"}>
					<rect
						x="234"
						y="248"
						width="140"
						height="68"
						rx="10"
						fill={c.fridge}
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="276"
						y="258"
						width="56"
						height="8"
						rx="4"
						fill={c.handle}
						stroke={INK}
						strokeWidth="2.5"
					/>
				</g>
				<g className={styles.drawer} data-open={open === "veg"}>
					<rect
						x="234"
						y="322"
						width="140"
						height="74"
						rx="10"
						fill={c.fridge}
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="276"
						y="332"
						width="56"
						height="8"
						rx="4"
						fill={c.handle}
						stroke={INK}
						strokeWidth="2.5"
					/>
				</g>
				<rect x="244" y="404" width="22" height="8" rx="3" fill={INK} />
				<rect x="342" y="404" width="22" height="8" rx="3" fill={INK} />
			</g>

			{/* クッション（れしぽよの寝床）：縫い目と、まんなかのボタン */}
			<g>
				<ellipse
					cx="300"
					cy="596"
					rx="54"
					ry="15"
					fill={c.fabric}
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<ellipse cx="300" cy="591" rx="40" ry="8" fill={c.fabricLight} />
				<ellipse
					cx="300"
					cy="594"
					rx="46"
					ry="10"
					fill="none"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeDasharray="4 4"
					opacity={DETAIL_OPACITY}
				/>
				<circle cx="300" cy="592" r="3" fill={c.wood} />
			</g>

			{/* 丸いテーブル（手前）：天板の木目、脚、台座 */}
			<g>
				<ellipse
					cx="140"
					cy="612"
					rx="58"
					ry="13"
					fill={c.tableFoot}
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<path
					d="M124 534H156L162 604H118Z"
					fill={c.tableSide}
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<path
					d="M132 548L130 596"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
				{/* 天板の側面：天板の楕円を、厚みの分だけ下へずらした下半分（どこでも同じ厚み） */}
				<path
					d="M20 502V516A120 40 0 0 0 260 516V502Z"
					fill={c.tableSide}
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<ellipse
					cx="140"
					cy="502"
					rx="120"
					ry="40"
					fill={c.tableTop}
					stroke={INK}
					strokeWidth={STROKE}
				/>
				<ellipse
					cx="140"
					cy="500"
					rx="104"
					ry="31"
					fill="none"
					stroke={c.tableRim}
					strokeWidth="2"
				/>
				<path
					d="M64 494Q100 484 132 490M150 512Q186 518 214 508M90 512Q110 516 124 514"
					fill="none"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
			</g>
			{tableTiles.slice(0, tableSlots.length).map((tile, index) => {
				const slot = tableSlots[index];

				return slot ? (
					<TileArtAt
						key={tile.key}
						tile={tile}
						x={slot.x}
						y={slot.y}
						size={TABLE_ART_SIZE}
					/>
				) : null;
			})}

			{/* 天井のランプ：コード、笠（縁の線）、電球 */}
			<g>
				<path d="M170 0V40" stroke={INK} strokeWidth="2" />
				<rect x="164" y="34" width="12" height="8" rx="2" fill={INK} />
				<ellipse
					cx="170"
					cy="68"
					rx="14"
					ry="6"
					fill="#fff6c8"
					stroke={INK}
					strokeWidth="2"
				/>
				<path
					d="M144 66L156 40H184L196 66Z"
					fill="#e9a900"
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
				<path
					d="M150 60H190"
					stroke={INK}
					strokeWidth={DETAIL}
					strokeLinecap="round"
					opacity={DETAIL_OPACITY}
				/>
			</g>
		</svg>
	);
}
