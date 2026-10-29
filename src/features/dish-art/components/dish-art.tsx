import type { DishPlacement } from "../domain/dish-cover";
import {
	type DishPart,
	type DishShape,
	dishArtViewSize,
	dishColors,
	findDishPart,
} from "../domain/dish-part";

function shapeRotation(shape: DishShape): string | undefined {
	if (shape.kind === "ellipse" && shape.rotate) {
		return `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`;
	}

	if (shape.kind === "rect" && shape.rotate) {
		return `rotate(${shape.rotate} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`;
	}

	return undefined;
}

function ShapeView({ shape, tint }: { shape: DishShape; tint: string }) {
	const common = {
		fill: shape.fill === "tint" ? tint : dishColors[shape.fill],
		opacity: shape.opacity,
		transform: shapeRotation(shape),
	};

	switch (shape.kind) {
		case "circle":
			return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
		case "ellipse":
			return (
				<ellipse
					cx={shape.cx}
					cy={shape.cy}
					rx={shape.rx}
					ry={shape.ry}
					{...common}
				/>
			);
		case "rect":
			return (
				<rect
					x={shape.x}
					y={shape.y}
					width={shape.width}
					height={shape.height}
					rx={shape.radius}
					{...common}
				/>
			);
		case "path":
			return <path d={shape.d} {...common} />;
		case "stroke":
			return (
				<path
					d={shape.d}
					fill="none"
					stroke={common.fill}
					strokeWidth={shape.width}
					strokeLinecap="round"
					strokeLinejoin="round"
					opacity={shape.opacity}
				/>
			);
	}
}

function PartView({
	part,
	placement,
}: {
	part: DishPart;
	placement?: DishPlacement;
}) {
	const tint = placement?.tint ?? part.tints[0] ?? dishColors.ink;
	const shapes = part.shapes.map((shape, index) => (
		// 図形の並びは固定なので、順番が識別子になる。
		// biome-ignore lint/suspicious/noArrayIndexKey: 固定の並び
		<ShapeView key={index} shape={shape} tint={tint} />
	));

	if (!placement) {
		return <>{shapes}</>;
	}

	const half = dishArtViewSize / 2;
	const scale = placement.scale ?? 1;
	const flipX = placement.flip ? -scale : scale;

	return (
		<g
			transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotate ?? 0}) scale(${flipX} ${scale}) translate(${-half} ${-half})`}
		>
			{shapes}
		</g>
	);
}

// 置いた部品を、重ね順どおりに描く（svg の中に置く）。
export function DishArtLayers({
	placements,
}: {
	placements: readonly DishPlacement[];
}) {
	return placements.map((placement, index) => {
		const part = findDishPart(placement.partId);

		return part ? (
			// 置いた順が重なり順。
			// biome-ignore lint/suspicious/noArrayIndexKey: 並びが識別子
			<PartView key={index} part={part} placement={placement} />
		) : null;
	});
}

type DishArtProps = {
	placements: readonly DishPlacement[];
	// 見た目の大きさ（px）。
	size?: number;
	background?: string;
};

// 部品を並べた料理の絵。飾りなので、読み上げない。
export function DishArt({ placements, size = 160, background }: DishArtProps) {
	return (
		<svg
			viewBox={`0 0 ${dishArtViewSize} ${dishArtViewSize}`}
			width={size}
			height={size}
			aria-hidden="true"
			focusable="false"
		>
			{background ? (
				<rect
					width={dishArtViewSize}
					height={dishArtViewSize}
					fill={background}
				/>
			) : null}
			<DishArtLayers placements={placements} />
		</svg>
	);
}

// 部品ひとつを、そのまま見せる（棚・確認用）。
export function DishPartPreview({
	part,
	tint,
	size = 96,
}: {
	part: DishPart;
	tint?: string;
	size?: number;
}) {
	return (
		<DishArt
			size={size}
			placements={[{ partId: part.id, x: 50, y: 50, tint }]}
		/>
	);
}
