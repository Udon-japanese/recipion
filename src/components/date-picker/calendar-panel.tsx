import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { IconButton } from "../icon-button/icon-button";
import {
	addDaysToDate,
	addMonthsToDate,
	buildMonthGrid,
	describeDate,
	parseIsoDate,
	weekdayLabels,
} from "./calendar";
import * as styles from "./date-picker.css";

type CalendarPanelProps = {
	// 選ばれている日（YYYY-MM-DD。なければ、空）。
	value: string;
	// 今日（YYYY-MM-DD）。
	today: string;
	onSelect: (date: string) => void;
	onClear: () => void;
};

// キーで動かした先の日。動かさないキーは、null。
function moveByKey(date: string, key: string): string | null {
	switch (key) {
		case "ArrowLeft":
			return addDaysToDate(date, -1);
		case "ArrowRight":
			return addDaysToDate(date, 1);
		case "ArrowUp":
			return addDaysToDate(date, -7);
		case "ArrowDown":
			return addDaysToDate(date, 7);
		case "PageUp":
			return addMonthsToDate(date, -1);
		case "PageDown":
			return addMonthsToDate(date, 1);
		default:
			return null;
	}
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

// 月のカレンダー。日を押して選ぶ。矢印キーで日、PageUp・PageDown で月を動く。
// 題（「2026年11月」）を押すと、年と月を選ぶ表になる（遠い日付へ、早く行くため）。
export function CalendarPanel({
	value,
	today,
	onSelect,
	onClear,
}: CalendarPanelProps) {
	const initial = value !== "" && parseIsoDate(value) ? value : today;
	const [focusedDate, setFocusedDate] = useState(initial);
	const [mode, setMode] = useState<"days" | "months">("days");
	const gridRef = useRef<HTMLTableElement>(null);
	const shouldFocusRef = useRef(true);

	const view = parseIsoDate(focusedDate) ?? { year: 2000, month: 1, day: 1 };
	const grid = buildMonthGrid(view.year, view.month);

	// 開いたとき（と、キーで動いたとき）、フォーカスを、いまの日に移す。
	useEffect(() => {
		if (mode !== "days" || !shouldFocusRef.current) {
			return;
		}

		shouldFocusRef.current = false;
		gridRef.current
			?.querySelector<HTMLButtonElement>('button[tabindex="0"]')
			?.focus();
	});

	function moveFocus(next: string) {
		shouldFocusRef.current = true;
		setFocusedDate(next);
	}

	function handleGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
		const next = moveByKey(focusedDate, event.key);

		if (next === null) {
			return;
		}

		event.preventDefault();
		moveFocus(next);
	}

	const title = `${view.year}年${view.month}月`;

	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				{mode === "days" ? (
					<>
						<IconButton
							icon="chevron-left"
							label="前の月"
							size="std"
							tone="plain"
							onClick={() => setFocusedDate(addMonthsToDate(focusedDate, -1))}
						/>
						<button
							className={styles.titleButton}
							type="button"
							aria-expanded={false}
							aria-label={`${title}。年と月を選ぶ`}
							onClick={() => setMode("months")}
						>
							{title}
							<Icon name="chevron-down" size={16} />
						</button>
						<IconButton
							icon="chevron-right"
							label="次の月"
							size="std"
							tone="plain"
							onClick={() => setFocusedDate(addMonthsToDate(focusedDate, 1))}
						/>
					</>
				) : (
					<>
						<IconButton
							icon="chevron-left"
							label="前の年"
							size="std"
							tone="plain"
							onClick={() => setFocusedDate(addMonthsToDate(focusedDate, -12))}
						/>
						<span className={styles.yearTitle}>{view.year}年</span>
						<IconButton
							icon="chevron-right"
							label="次の年"
							size="std"
							tone="plain"
							onClick={() => setFocusedDate(addMonthsToDate(focusedDate, 12))}
						/>
					</>
				)}
			</div>

			{mode === "months" ? (
				<div className={styles.monthGrid}>
					{months.map((month) => (
						<button
							className={styles.monthButton}
							type="button"
							key={month}
							aria-current={month === view.month ? "true" : undefined}
							onClick={() => {
								shouldFocusRef.current = true;
								setFocusedDate(
									addMonthsToDate(focusedDate, month - view.month),
								);
								setMode("days");
							}}
						>
							{month}月
						</button>
					))}
				</div>
			) : (
				<table
					className={styles.grid}
					aria-label={title}
					ref={gridRef}
					onKeyDown={handleGridKeyDown}
				>
					<thead>
						<tr>
							{weekdayLabels.map((label) => (
								<th
									className={styles.weekday}
									scope="col"
									key={label}
									aria-label={`${label}曜日`}
								>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{grid.map((week) => (
							<tr key={week[0].date}>
								{week.map((day) => (
									<td className={styles.cell} key={day.date}>
										<button
											className={styles.dayButton}
											type="button"
											tabIndex={day.date === focusedDate ? 0 : -1}
											aria-label={describeDate(day.date)}
											aria-current={day.date === today ? "date" : undefined}
											aria-pressed={day.date === value}
											data-selected={day.date === value || undefined}
											data-outside={!day.inMonth || undefined}
											onClick={() => onSelect(day.date)}
										>
											{day.day}
										</button>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			)}

			<div className={styles.footer}>
				<Button variant="secondary" size="sm" onClick={onClear}>
					消す
				</Button>
				<Button variant="secondary" size="sm" onClick={() => onSelect(today)}>
					今日
				</Button>
			</div>
		</div>
	);
}
