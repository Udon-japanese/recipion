import { useEffect, useId, useRef, useState } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { Toggle } from "#/components/toggle/toggle";
import * as styles from "./recipe-made-options.css";

type MadeOption = {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
};

type RecipeMadeOptionsProps = {
	options: readonly MadeOption[];
	disabled?: boolean;
};

// 「つくった！」の横の、調整のボタン。押すと、小さな欄に、そのときだけの選択（スイッチ）を出す。
// 外を押す・Esc で閉じる。
export function RecipeMadeOptions({
	options,
	disabled,
}: RecipeMadeOptionsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const panelId = useId();

	useEffect(() => {
		if (!isOpen) return;

		function handlePointerDown(event: PointerEvent) {
			if (
				event.target instanceof Node &&
				!rootRef.current?.contains(event.target)
			) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
				rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
			}
		}

		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div className={styles.root} ref={rootRef}>
			<IconButton
				icon="settings"
				label="作ったときの設定"
				size="std"
				tone={isOpen ? "on" : "muted"}
				disabled={disabled}
				aria-expanded={isOpen}
				aria-controls={isOpen ? panelId : undefined}
				onClick={() => setIsOpen((current) => !current)}
			/>
			{isOpen ? (
				<div className={styles.panel} id={panelId}>
					{options.map((option) => (
						<MadeOptionRow key={option.label} option={option} />
					))}
				</div>
			) : null}
		</div>
	);
}

function MadeOptionRow({ option }: { option: MadeOption }) {
	const id = useId();

	return (
		<div className={styles.row}>
			<label className={styles.label} htmlFor={id} aria-hidden="true">
				{option.label}
			</label>
			<Toggle
				id={id}
				label={option.label}
				checked={option.checked}
				onChange={option.onChange}
			/>
		</div>
	);
}
