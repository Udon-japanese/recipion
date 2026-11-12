/**
 * 買い物メモに出す、いまの日時（「11/12（木）9:05」）。お惣菜の期限のラベルと比べられるように、分まで出す。
 * timeZone を省くと、端末の時刻（お店で見るラベルと同じ）。
 */
export function formatShoppingClock(now: Date, timeZone?: string): string {
	const parts = new Intl.DateTimeFormat("ja-JP", {
		timeZone,
		month: "numeric",
		day: "numeric",
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value ?? "";

	return `${part("month")}/${part("day")}（${part("weekday")}）${part("hour")}:${part("minute")}`;
}
