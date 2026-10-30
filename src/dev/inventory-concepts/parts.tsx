import type { RefObject } from "react";
import { Icon } from "#/components/icon/icon";
import * as styles from "./concepts.css";
import { ItemArt } from "./item-art";
import * as petStyles from "./pet.css";
import { categoryTint, describeExpiry, type SampleItem } from "./sample-data";

export type PetMood = "walk" | "idle" | "look" | "peek" | "sleep" | "cheer";

// れしぽよのしぐさの試作。位置と跳ねは、場面（scene-view）の中で、useHopWalker が決める。
export function Pet({
	mood,
	onPoke,
	buttonRef,
	hopRef,
	isStatic = false,
	style,
}: {
	mood: PetMood;
	onPoke?: () => void;
	buttonRef?: RefObject<HTMLButtonElement | null>;
	hopRef?: RefObject<HTMLSpanElement | null>;
	// 場面の外（庫内の縁）に、動かさずに置くとき。
	isStatic?: boolean;
	style?: React.CSSProperties;
}) {
	return (
		<button
			className={petStyles.pet}
			ref={buttonRef}
			type="button"
			data-mood={mood}
			data-static={isStatic}
			style={style}
			aria-label="れしぽよをつつく"
			onClick={onPoke}
		>
			<span className={petStyles.hopLayer} ref={hopRef}>
				<span className={petStyles.body} />
				{mood === "sleep" ? <span className={petStyles.zzz}>z</span> : null}
			</span>
		</button>
	);
}

// 食材の絵（料理の絵の部品）。カテゴリの色の、やわらかい四角の上に置く。
export function Glyph({
	item,
	size = 56,
}: {
	item: SampleItem;
	size?: number;
}) {
	return (
		<span
			className={styles.itemArt}
			style={{
				background: categoryTint[item.category],
				width: size,
				height: size,
			}}
			aria-hidden
		>
			<ItemArt item={item} size={size - 6} />
		</span>
	);
}

export function ExpiryBadge({ item }: { item: SampleItem }) {
	const expiry = describeExpiry(item);

	if (!expiry) {
		return null;
	}

	return (
		<span className={styles.expiryBadge} data-level={expiry.level} aria-hidden>
			<Icon
				name={expiry.level === "expired" ? "alert-triangle" : "clock"}
				size={16}
			/>
			{expiry.text}
		</span>
	);
}
