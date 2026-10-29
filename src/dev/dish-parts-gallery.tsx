import type { CSSProperties } from "react";
import {
	DishArt,
	DishPartPreview,
} from "#/features/dish-art/components/dish-art";
import { dishParts } from "#/features/dish-art/domain/dish-part";
import { dishPresets } from "#/features/dish-art/domain/dish-preset";

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
				{dishPresets.map((preset) => (
					<div key={preset.id} style={cell}>
						<DishArt placements={preset.placements} size={200} />
						{preset.label}のプリセット
					</div>
				))}
			</div>
		</section>
	);
}
