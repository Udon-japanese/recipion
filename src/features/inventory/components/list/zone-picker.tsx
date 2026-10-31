import { useRef, useState } from "react";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import type { InventoryZoneId } from "../../domain/inventory-fridge";
import * as styles from "./zone-picker.css";
import { tabOrder, zoneIcons, zoneLabels } from "./zone-tabs";

type ZonePickerProps = {
	// 選ばれている場所（「すべて」のときは null）。
	value: InventoryZoneId | null;
	counts: Partial<Record<InventoryZoneId, number>>;
	// 「すべて」を選べるときは、その件数。選べないとき（おうちの庫内など）は、省略。
	allCount?: number;
	// heading：庫内の見出しとして（「冷蔵室（1） ▾」）。field：一覧の上の欄として（「場所：すべて ▾」）。
	variant: "heading" | "field";
	onChange: (zone: InventoryZoneId | null) => void;
};

// スマホで、場所を選ぶ。縦タブは、幅をとるので、押すと、下のシートに場所の一覧が出る形にする。
export function ZonePicker({
	value,
	counts,
	allCount,
	variant,
	onChange,
}: ZonePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const label = value === null ? "すべて" : zoneLabels[value];
	const count = value === null ? allCount : (counts[value] ?? 0);

	function choose(zone: InventoryZoneId | null) {
		onChange(zone);
		setIsOpen(false);
		triggerRef.current?.focus();
	}

	return (
		<>
			<button
				ref={triggerRef}
				className={
					variant === "heading" ? styles.headingTrigger : styles.fieldTrigger
				}
				type="button"
				aria-haspopup="dialog"
				aria-label={`場所：${label}。場所を選ぶ`}
				onClick={() => setIsOpen(true)}
			>
				{variant === "field" ? (
					<span className={styles.fieldLabel}>場所</span>
				) : null}
				{value === null ? null : <Icon name={zoneIcons[value]} size={24} />}
				<span className={styles.triggerText}>{label}</span>
				{count === undefined ? null : (
					<span className={styles.triggerCount}>（{count}）</span>
				)}
				<Icon name="chevron-down" size={20} />
			</button>

			<Sheet
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsOpen(false);
						triggerRef.current?.focus();
					}
				}}
				title="場所"
				snapPoints={[0.6]}
			>
				<div className={styles.list}>
					{allCount === undefined ? null : (
						<button
							className={styles.option}
							type="button"
							aria-current={value === null ? "true" : undefined}
							onClick={() => choose(null)}
						>
							<span className={styles.optionIcon} />
							<span className={styles.optionLabel}>すべて</span>
							<span className={styles.optionCount}>{allCount}</span>
							{value === null ? <Icon name="check" size={20} /> : null}
						</button>
					)}

					{tabOrder.map((id) => (
						<button
							className={styles.option}
							type="button"
							key={id}
							aria-current={id === value ? "true" : undefined}
							onClick={() => choose(id)}
						>
							<span className={styles.optionIcon}>
								<Icon name={zoneIcons[id]} size={24} />
							</span>
							<span className={styles.optionLabel}>{zoneLabels[id]}</span>
							<span className={styles.optionCount}>{counts[id] ?? 0}</span>
							{id === value ? <Icon name="check" size={20} /> : null}
						</button>
					))}
				</div>
			</Sheet>
		</>
	);
}
