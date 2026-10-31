// アイコンの一覧（デザインの icons.zip から生成。24×24・線 2px・色は currentColor）。
// 色つきのもの（mascot・pip-egg・water-wave）は、ここに含めない（それぞれ、専用の部品・CSS で描く）。
import type { ReactNode } from "react";

export type IconStyle = "outline" | "solid" | "filled";

export const iconDefinitions = {
	"alert-circle": {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M12 7v6M12 16.5v.5" />
			</>
		) as ReactNode,
	},
	"alert-triangle": {
		style: "outline",
		content: (<path d="M12 3l10 18H2L12 3zM12 10v5M12 18v.5" />) as ReactNode,
	},
	"arrow-down": {
		style: "outline",
		content: (<path d="M12 5v14M6 13l6 6 6-6" />) as ReactNode,
	},
	"arrow-up": {
		style: "outline",
		content: (<path d="M12 19V5M6 11l6-6 6 6" />) as ReactNode,
	},
	"arrow-up-right": {
		style: "outline",
		content: (<path d="M7 17L17 7M9 7h8v8" />) as ReactNode,
	},
	"ban-circle": {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M6 18L18 6" />
			</>
		) as ReactNode,
	},
	bars: {
		style: "outline",
		content: (<path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />) as ReactNode,
	},
	book: {
		style: "outline",
		content: (
			<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13" />
		) as ReactNode,
	},
	"branch-arrow": {
		style: "outline",
		content: (<path d="M5 4v6a4 4 0 004 4h9M15 10l4 4-4 4" />) as ReactNode,
	},
	calendar: {
		style: "outline",
		content: (<path d="M5 6h14v14H5zM5 10h14M9 3v4M15 3v4" />) as ReactNode,
	},
	carton: {
		style: "outline",
		content: (<path d="M7 3h10v18H7zM7 10h10M10 6v2M10 13v3" />) as ReactNode,
	},
	"check-circle": {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M8 12.5l3 3 5-6" />
			</>
		) as ReactNode,
	},
	check: {
		style: "outline",
		content: (<path d="M5 12.5l4.5 4.5L19 7" />) as ReactNode,
	},
	"chevron-down": {
		style: "outline",
		content: (<path d="M6 9l6 6 6-6" />) as ReactNode,
	},
	"chevron-left": {
		style: "outline",
		content: (<path d="M15 5l-7 7 7 7" />) as ReactNode,
	},
	"chevron-right": {
		style: "outline",
		content: (<path d="M9 5l7 7-7 7" />) as ReactNode,
	},
	clock: {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M12 7v5l3 2" />
			</>
		) as ReactNode,
	},
	close: {
		style: "outline",
		content: (<path d="M6 6l12 12M18 6L6 18" />) as ReactNode,
	},
	edit: {
		style: "outline",
		content: (
			<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" />
		) as ReactNode,
	},
	// れしぽよ。表示中は塗りのシルエット（目は抜く）、非表示は同じ形の点線。
	"mascot-shown": {
		style: "solid",
		content: (
			<path
				fillRule="evenodd"
				d="M12 4C6.5 4 3.5 8.5 3.5 13c0 4.5 2 7 4.5 7h8c2.5 0 4.5-2.5 4.5-7C20.5 8.5 17.5 4 12 4zM8.4 10.4a.95.95 0 0 1 1.9 0v3.2a.95.95 0 0 1-1.9 0zM13.7 10.4a.95.95 0 0 1 1.9 0v3.2a.95.95 0 0 1-1.9 0z"
			/>
		) as ReactNode,
	},
	"mascot-hidden": {
		style: "outline",
		content: (
			<>
				<path
					strokeDasharray="2.6 3"
					d="M12 4C6.5 4 3.5 8.5 3.5 13c0 4.5 2 7 4.5 7h8c2.5 0 4.5-2.5 4.5-7C20.5 8.5 17.5 4 12 4z"
				/>
				<path d="M9.35 10.8v2.4M14.65 10.8v2.4" />
			</>
		) as ReactNode,
	},
	grip: {
		style: "solid",
		content: (
			<>
				<circle cx={9} cy={6} r={1.7} />
				<circle cx={15} cy={6} r={1.7} />
				<circle cx={9} cy={12} r={1.7} />
				<circle cx={15} cy={12} r={1.7} />
				<circle cx={9} cy={18} r={1.7} />
				<circle cx={15} cy={18} r={1.7} />
			</>
		) as ReactNode,
	},
	"info-circle": {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M12 11v6M12 7.5v.5" />
			</>
		) as ReactNode,
	},
	"inventory-box": {
		style: "outline",
		content: (
			<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10" />
		) as ReactNode,
	},
	list: {
		style: "outline",
		content: (
			<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
		) as ReactNode,
	},
	lock: {
		style: "outline",
		content: (<path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3" />) as ReactNode,
	},
	minus: { style: "outline", content: (<path d="M5 12h14" />) as ReactNode },
	"more-horizontal": {
		style: "solid",
		content: (
			<>
				<circle cx={5} cy={12} r={1.8} />
				<circle cx={12} cy={12} r={1.8} />
				<circle cx={19} cy={12} r={1.8} />
			</>
		) as ReactNode,
	},
	copy: {
		style: "outline",
		content: (<path d="M9 9h11v11H9zM5 15V4h11" />) as ReactNode,
	},
	// 左右に向き合う三角：左右反転。
	flip: {
		style: "outline",
		content: (<path d="M12 3v18M8 7L3 18h5zM16 7l5 11h-5z" />) as ReactNode,
	},
	multiply: {
		style: "outline",
		content: (<path d="M7 7l10 10M17 7L7 17" />) as ReactNode,
	},
	plus: {
		style: "outline",
		content: (<path d="M12 5v14M5 12h14" />) as ReactNode,
	},
	// 重なったカードに「＋」：いつもの1つ追加ではない、特別な入れ方（まとめて・レシピから・条件つき）。
	"plus-stack": {
		style: "outline",
		content: (
			<path d="M8 8V5h12v12h-3M4 8h12v12H4zM10 11v6M7 14h6" />
		) as ReactNode,
	},
	refresh: {
		style: "outline",
		content: (<path d="M20 11a8 8 0 10-2 6M20 5v6h-6" />) as ReactNode,
	},
	rows: {
		style: "outline",
		content: (<path d="M4 5h16v14H4zM4 12h16" />) as ReactNode,
	},
	ruler: {
		style: "outline",
		content: (
			<path d="M3 17L17 3l4 4L7 21l-4-4zM8 12l2 2M11 9l2 2M14 6l2 2" />
		) as ReactNode,
	},
	settings: {
		style: "outline",
		content: (
			<>
				<path d="M18.6 9.6L21.3 10L21.3 14L18.6 14.4L18.4 14.9L20 17.2L17.2 20L14.9 18.4L14.4 18.6L14 21.3L10 21.3L9.6 18.6L9.1 18.4L6.8 20L4 17.2L5.6 14.9L5.4 14.4L2.7 14L2.7 10L5.4 9.6L5.6 9.1L4 6.8L6.8 4L9.1 5.6L9.6 5.4L10 2.7L14 2.7L14.4 5.4L14.9 5.6L17.2 4L20 6.8L18.4 9.1z" />
				<circle cx={12} cy={12} r={3} />
			</>
		) as ReactNode,
	},
	"shopping-bag": {
		style: "outline",
		content: (<path d="M3 9h18l-2 11H5L3 9zM8 9l3-5M16 9l-3-5" />) as ReactNode,
	},
	sliders: {
		style: "outline",
		content: (
			<path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6" />
		) as ReactNode,
	},
	spinner: {
		style: "outline",
		content: (
			<>
				<circle cx={12} cy={12} r={9} opacity={0.3} />
				<path d="M12 3a9 9 0 019 9" />
			</>
		) as ReactNode,
	},
	"square-rounded": {
		style: "outline",
		content: (<rect x={4} y={4} width={16} height={16} rx={4} />) as ReactNode,
	},
	store: {
		style: "outline",
		content: (
			<path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6" />
		) as ReactNode,
	},
	swap: {
		style: "outline",
		content: (
			<path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4" />
		) as ReactNode,
	},
	sync: {
		style: "outline",
		content: (
			<path d="M20 11a8 8 0 00-14-4M4 5v4h4M4 13a8 8 0 0014 4M20 19v-4h-4" />
		) as ReactNode,
	},
	trash: {
		style: "outline",
		content: (
			<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />
		) as ReactNode,
	},
	// 90度、右に回す。
	"rotate-right": {
		style: "outline",
		content: (<path d="M20 6v5h-5M19.5 11A8 8 0 1012 20" />) as ReactNode,
	},
	redo: {
		style: "outline",
		content: (<path d="M15 6l5 5-5 5M20 11h-9a6 6 0 000 12h3" />) as ReactNode,
	},
	undo: {
		style: "outline",
		content: (<path d="M9 6L4 11l5 5M4 11h9a6 6 0 010 12h-3" />) as ReactNode,
	},
	"wifi-off": {
		style: "outline",
		content: (
			<path d="M2 8.8a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5v.5M3 3l18 18" />
		) as ReactNode,
	},
	"zone-door": {
		style: "outline",
		content: (<path d="M6 3h12v18H6zM14 8v4M6 15h12" />) as ReactNode,
	},
	"zone-freezer": {
		style: "outline",
		content: (<path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9" />) as ReactNode,
	},
	"zone-fridge": {
		style: "outline",
		content: (<path d="M6 3h12v18H6zM6 9h12M6 15h12" />) as ReactNode,
	},
	"zone-table": {
		style: "outline",
		content: (<path d="M3 8h18M6 8v12M18 8v12" />) as ReactNode,
	},
	"zone-vegetable": {
		style: "outline",
		content: (
			<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8" />
		) as ReactNode,
	},
	"book-fill": {
		style: "filled",
		content: (
			<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13" />
		) as ReactNode,
	},
	"check-circle-fill": {
		style: "filled",
		content: (
			<>
				<circle cx={12} cy={12} r={9} />
				<path d="M8 12.5l3 3 5-6" />
			</>
		) as ReactNode,
	},
	"inventory-box-fill": {
		style: "filled",
		content: (
			<path d="M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10" />
		) as ReactNode,
	},
	"shopping-bag-fill": {
		style: "filled",
		content: (<path d="M3 9h18l-2 11H5L3 9zM8 9l3-5M16 9l-3-5" />) as ReactNode,
	},
} as const satisfies Record<string, { style: IconStyle; content: ReactNode }>;

export type IconName = keyof typeof iconDefinitions;
