import type { InventoryTile } from "../../domain/inventory-fridge";
import { PartAt, TileArtAt } from "./art-at";
import * as styles from "./scene.css";

const INK = "var(--color-text)";
const STROKE = 2.5;

export type OpenPart = "top" | "veg" | "freezer" | null;

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
			<rect x="-200" width="800" height="400" fill="#f6dfae" />
			<rect x="-200" y="300" width="800" height="100" fill="#efd29a" />
			<path d="M-200 300H600" stroke="#d9b676" strokeWidth="3" />
			<rect x="-200" y="400" width="800" height="240" fill="#d9a766" />
			{[-200, -120, -40, 40, 120, 200, 280, 360, 440, 520, 600].map((x) => (
				<path
					key={x}
					d={`M${x} 400L${200 + (x - 200) * 3.4} 640`}
					stroke="#c4914f"
					strokeWidth="2"
				/>
			))}
			<path d="M-200 400H600" stroke={INK} strokeWidth={STROKE} />

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
			<Plant x={90} y={217} scale={0.5} />

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

				{/* 冷凍室（引き出し。奥に中身） */}
				<rect
					x="234"
					y="248"
					width="140"
					height="68"
					rx="10"
					fill="#dfe8ee"
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
					fill="#e9dfc4"
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
				<g className={styles.drawer} data-open={open === "freezer"}>
					<rect
						x="234"
						y="248"
						width="140"
						height="68"
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
				<g className={styles.drawer} data-open={open === "veg"}>
					<rect
						x="234"
						y="322"
						width="140"
						height="74"
						rx="10"
						fill="#fffdf7"
						stroke={INK}
						strokeWidth="3"
					/>
					<rect
						x="276"
						y="332"
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
			{tableTiles.slice(0, tableSlots.length).map((tile, index) => {
				const slot = tableSlots[index];

				return slot ? (
					<TileArtAt
						key={tile.key}
						tile={tile}
						x={slot.x}
						y={slot.y}
						size={40}
					/>
				) : null;
			})}

			{/* 天井のランプ */}
			<g>
				<path d="M170 0V40" stroke={INK} strokeWidth="3" />
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
					d="M146 66L156 40H184L194 66Z"
					fill="#e9a900"
					stroke={INK}
					strokeWidth={STROKE}
					strokeLinejoin="round"
				/>
			</g>

			{/* 光と夕方の暗さ */}
			<rect
				className={styles.fade}
				x="-200"
				width="800"
				height="640"
				fill="url(#lampGlow)"
				style={{ opacity: night ? 0.9 : 0.35 }}
				pointerEvents="none"
			/>
			<rect
				className={styles.fade}
				x="-200"
				width="800"
				height="640"
				fill="url(#duskShade)"
				style={{ opacity: night ? 1 : 0 }}
				pointerEvents="none"
			/>
		</svg>
	);
}
