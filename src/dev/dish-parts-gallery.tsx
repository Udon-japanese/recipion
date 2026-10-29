import type { CSSProperties } from "react";
import {
	DishArt,
	DishPartPreview,
	type DishPlacement,
} from "#/features/dish-art/components/dish-art";
import { dishParts } from "#/features/dish-art/domain/dish-part";

const cell: CSSProperties = {
	display: "grid",
	justifyItems: "center",
	gap: 4,
	padding: 8,
	background: "var(--color-primary-soft)",
	borderRadius: 12,
	fontSize: 13,
};

const wrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12 };

const teishoku: readonly DishPlacement[] = [
	{ partId: "rice", x: 28, y: 50, scale: 0.55 },
	{ partId: "donburi", x: 28, y: 66, scale: 0.62 },
	{ partId: "miso-soup", x: 74, y: 62, scale: 0.5, tint: "#3f6fa3" },
	{ partId: "grilled-fish", x: 40, y: 82, scale: 0.55, rotate: -6 },
	{ partId: "greens", x: 80, y: 84, scale: 0.34 },
];

const tamagoDon: readonly DishPlacement[] = [
	{ partId: "rice", x: 50, y: 38, scale: 0.8 },
	{ partId: "donburi", x: 50, y: 56, scale: 0.95 },
	{ partId: "tamagoyaki", x: 50, y: 36, scale: 0.6 },
	{ partId: "greens", x: 74, y: 30, scale: 0.28, rotate: 20 },
];

const ramen: readonly DishPlacement[] = [
	{ partId: "noodles", x: 50, y: 40, scale: 0.85 },
	{ partId: "donburi", x: 50, y: 56, scale: 0.95, tint: "#3f6fa3" },
	{ partId: "tamagoyaki", x: 38, y: 40, scale: 0.3 },
	{ partId: "greens", x: 66, y: 36, scale: 0.26 },
];

const breakfast: readonly DishPlacement[] = [
	{ partId: "plate", x: 38, y: 62, scale: 0.8, tint: "#e6dfcb" },
	{ partId: "shokupan", x: 38, y: 52, scale: 0.46 },
	{ partId: "mug", x: 78, y: 62, scale: 0.55, tint: "#d9573f" },
];

const karaageSet: readonly DishPlacement[] = [
	{ partId: "plate", x: 50, y: 62, scale: 0.95, tint: "#e6dfcb" },
	{ partId: "karaage", x: 44, y: 52, scale: 0.55 },
	{ partId: "greens", x: 72, y: 50, scale: 0.32 },
];

const eggBreakfast: readonly DishPlacement[] = [
	{ partId: "plate", x: 50, y: 62, scale: 0.95, tint: "#3f6fa3" },
	{ partId: "fried-egg", x: 40, y: 54, scale: 0.5 },
	{ partId: "sausage", x: 66, y: 48, scale: 0.4, rotate: -20 },
	{ partId: "sausage", x: 68, y: 60, scale: 0.4, rotate: -8 },
];

// 料理の絵の部品の試作（図形だけで描く）。
export function DishPartsGallery() {
	return (
		<section style={{ display: "grid", gap: 12 }}>
			<h2 style={{ margin: 0, fontSize: 18 }}>料理の絵の部品（試作）</h2>
			<div style={wrap}>
				{dishParts.map((part) => (
					<div key={part.id} style={cell}>
						<DishPartPreview part={part} />
						{part.label}
					</div>
				))}
				{dishParts
					.filter((part) => part.tints.length > 1)
					.flatMap((part) =>
						part.tints.slice(1).map((tint) => (
							<div key={`${part.id}-${tint}`} style={cell}>
								<DishPartPreview part={part} tint={tint} />
								{part.label}（色違い）
							</div>
						)),
					)}
			</div>
			<div style={wrap}>
				<div style={cell}>
					<DishArt placements={teishoku} size={200} />
					定食の組み合わせ
				</div>
				<div style={cell}>
					<DishArt placements={tamagoDon} size={200} />
					卵丼の組み合わせ
				</div>
				<div style={cell}>
					<DishArt placements={ramen} size={200} />
					ラーメンの組み合わせ
				</div>
				<div style={cell}>
					<DishArt placements={breakfast} size={200} />
					朝ごはんの組み合わせ
				</div>
				<div style={cell}>
					<DishArt placements={karaageSet} size={200} />
					唐揚げの組み合わせ
				</div>
				<div style={cell}>
					<DishArt placements={eggBreakfast} size={200} />
					卵とウインナーの組み合わせ
				</div>
			</div>
		</section>
	);
}
