// 違反（公開しようとして、block になった試行）の回数と、その結果の段階。
// 1日（日本時間）に3回で、その日は公開できない。最後の違反から7日以内に、また3回に至れば、アカウントを停止する。

export const maxViolationsPerDay = 3;
export const repeatWindowDays = 7;

const jstOffsetMs = 9 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

// 日本時間の日付（YYYY-MM-DD）。
export function toJstDate(date: Date): string {
	return new Date(date.getTime() + jstOffsetMs).toISOString().slice(0, 10);
}

export type ViolationOutcome =
	// 1回目：断る。
	| "rejected"
	// 2回目：警告（次は、その日の公開ができなくなる）。
	| "warned"
	// 3回目：その日は、公開できない。
	| "locked"
	// 3回目に至るのが、前回の3回目から7日以内：アカウントの停止。
	| "suspended";

// 違反の時刻（今回の分を含む）から、今回の結果を決める。
export function evaluateViolations(
	violationTimes: readonly Date[],
	now: Date,
): ViolationOutcome {
	const today = toJstDate(now);
	const todayCount = violationTimes.filter(
		(time) => toJstDate(time) === today,
	).length;

	if (todayCount < maxViolationsPerDay) {
		return todayCount <= 1 ? "rejected" : "warned";
	}

	const countsByDate = new Map<string, { count: number; last: number }>();

	for (const time of violationTimes) {
		const date = toJstDate(time);

		if (date === today) {
			continue;
		}

		const entry = countsByDate.get(date) ?? { count: 0, last: 0 };

		countsByDate.set(date, {
			count: entry.count + 1,
			last: Math.max(entry.last, time.getTime()),
		});
	}

	const repeated = [...countsByDate.values()].some(
		(entry) =>
			entry.count >= maxViolationsPerDay &&
			now.getTime() - entry.last <= repeatWindowDays * dayMs,
	);

	return repeated ? "suspended" : "locked";
}

// 今日は、すでに上限（3回）に達しているか。
export function isLockedToday(
	violationTimes: readonly Date[],
	now: Date,
): boolean {
	const today = toJstDate(now);

	return (
		violationTimes.filter((time) => toJstDate(time) === today).length >=
		maxViolationsPerDay
	);
}

// 違反の記録を数える範囲の始まり（今日の 0 時より前の、7日分も含める）。
export function violationLookbackStart(now: Date): Date {
	return new Date(now.getTime() - (repeatWindowDays + 1) * dayMs);
}
