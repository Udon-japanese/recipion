import type { RefObject } from "react";
import { Tag } from "#/components/tag/tag";
import * as styles from "./concepts.css";
import { ItemArt } from "./item-art";
import * as petStyles from "./pet.css";
import { describeAmount, describeExpiry, type SampleItem } from "./sample-data";

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

function ExpiryTag({ item }: { item: SampleItem }) {
	const expiry = describeExpiry(item);

	if (!expiry) {
		return null;
	}

	return (
		<Tag
			tone={expiry.level === "near" ? "warn" : "error"}
			icon={expiry.level === "expired" ? "alert-triangle" : "clock"}
		>
			{expiry.text}
		</Tag>
	);
}

// 在庫の1件（絵・名前・量・期限）。一覧でも、庫内の棚でも使う。
export function ItemRow({
	item,
	selected,
	variant,
	extra,
	onSelect,
}: {
	item: SampleItem;
	selected: boolean;
	// card：棚の中の1枚／row：一覧の1行。
	variant: "card" | "row";
	// 名前の下の、補足の札（場所など）。
	extra?: React.ReactNode;
	onSelect: (item: SampleItem) => void;
}) {
	return (
		<button
			className={styles.item}
			type="button"
			data-variant={variant}
			data-selected={selected}
			onClick={() => onSelect(item)}
		>
			<span className={styles.itemArt} aria-hidden>
				<ItemArt item={item} size={56} />
			</span>
			<span className={styles.itemText}>
				<span className={styles.itemName}>{item.name}</span>
				<span className={styles.itemMeta}>
					<span className={styles.itemAmount}>{describeAmount(item)}</span>
					<ExpiryTag item={item} />
					{extra}
				</span>
			</span>
		</button>
	);
}
