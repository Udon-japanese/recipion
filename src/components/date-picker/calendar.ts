// 日付（YYYY-MM-DD）の計算。ここでの日付は、時刻・時差のない、暦の上の日付（ローカルの暦）として扱う。

export type CalendarDay = {
	// YYYY-MM-DD
	date: string;
	day: number;
	// 表示している月の日か（前後の月の日は、薄く出す）。
	inMonth: boolean;
};

export const weekdayLabels = [
	"日",
	"月",
	"火",
	"水",
	"木",
	"金",
	"土",
] as const;

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/u;

function pad(value: number, length: number): string {
	return String(value).padStart(length, "0");
}

export function formatIsoDate(
	year: number,
	month: number,
	day: number,
): string {
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

// 暦の上で、実際にある日付か（2月30日などは、ない）。
function isRealDate(year: number, month: number, day: number): boolean {
	if (month < 1 || month > 12 || day < 1) {
		return false;
	}

	return day <= daysInMonth(year, month);
}

export function daysInMonth(year: number, month: number): number {
	// 翌月の0日 ＝ その月の最終日。
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// YYYY-MM-DD を読む。ない日付・形が違うものは、null。
export function parseIsoDate(
	text: string,
): { year: number; month: number; day: number } | null {
	const match = datePattern.exec(text);

	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);

	return isRealDate(year, month, day) ? { year, month, day } : null;
}

// 曜日（0＝日曜）。
export function weekdayOf(date: string): number {
	const parsed = parseIsoDate(date);

	if (!parsed) {
		return 0;
	}

	return new Date(
		Date.UTC(parsed.year, parsed.month - 1, parsed.day),
	).getUTCDay();
}

export function addDaysToDate(date: string, days: number): string {
	const parsed = parseIsoDate(date);

	if (!parsed) {
		return date;
	}

	const shifted = new Date(
		Date.UTC(parsed.year, parsed.month - 1, parsed.day + days),
	);

	return formatIsoDate(
		shifted.getUTCFullYear(),
		shifted.getUTCMonth() + 1,
		shifted.getUTCDate(),
	);
}

// 月を動かす。日が、その月にないとき（1/31 の次の月）は、その月の最終日にする。
export function addMonthsToDate(date: string, months: number): string {
	const parsed = parseIsoDate(date);

	if (!parsed) {
		return date;
	}

	const index = parsed.year * 12 + (parsed.month - 1) + months;
	const year = Math.floor(index / 12);
	const month = (index % 12) + 1;

	return formatIsoDate(
		year,
		month,
		Math.min(parsed.day, daysInMonth(year, month)),
	);
}

// 月のカレンダー（日曜始まり、6週）。前後の月の日で、週を埋める。
export function buildMonthGrid(year: number, month: number): CalendarDay[][] {
	const first = formatIsoDate(year, month, 1);
	const start = addDaysToDate(first, -weekdayOf(first));

	return Array.from({ length: 6 }, (_, week) =>
		Array.from({ length: 7 }, (_, dayOfWeek) => {
			const date = addDaysToDate(start, week * 7 + dayOfWeek);
			const parsed = parseIsoDate(date);

			return {
				date,
				day: parsed?.day ?? 0,
				inMonth: parsed?.month === month && parsed?.year === year,
			};
		}),
	);
}

// 入力欄に出す形（2026/11/02）。読めなければ、そのまま空。
export function formatDisplayDate(date: string): string {
	const parsed = parseIsoDate(date);

	return parsed
		? `${pad(parsed.year, 4)}/${pad(parsed.month, 2)}/${pad(parsed.day, 2)}`
		: "";
}

// 読み上げ・ボタンの名前に使う形（2026年11月2日 月曜日）。
export function describeDate(date: string): string {
	const parsed = parseIsoDate(date);

	return parsed
		? `${parsed.year}年${parsed.month}月${parsed.day}日 ${weekdayLabels[weekdayOf(date)]}曜日`
		: "";
}

// 打った文字を、日付にする。「2026/11/2」「2026-11-02」「2026.11.2」「20261102」「11/2」（年は、今日の年）。
// 全角の数字も読む。ない日付・読めない形は、null。
export function parseTypedDate(text: string, today: string): string | null {
	const normalized = text.normalize("NFKC").trim();

	if (normalized === "") {
		return null;
	}

	const full = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/u.exec(normalized);
	const compact = /^(\d{4})(\d{2})(\d{2})$/u.exec(normalized);
	const short = /^(\d{1,2})[/\-.](\d{1,2})$/u.exec(normalized);
	const todayParsed = parseIsoDate(today);

	let year: number;
	let month: number;
	let day: number;

	if (full ?? compact) {
		const match = (full ?? compact) as RegExpExecArray;

		year = Number(match[1]);
		month = Number(match[2]);
		day = Number(match[3]);
	} else if (short && todayParsed) {
		year = todayParsed.year;
		month = Number(short[1]);
		day = Number(short[2]);
	} else {
		return null;
	}

	return isRealDate(year, month, day) ? formatIsoDate(year, month, day) : null;
}
