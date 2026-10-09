import type { RecipeLinkTarget } from "./recipe-links";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	month: "numeric",
	day: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	month: "numeric",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

// 同じ名前のレシピを、候補の一覧で見分けるための表示（日本時間）。名前が重ならないレシピには、付けない（null）。
// 登録日を示す。同じ名前で、同じ日に登録したものがあれば、時刻まで示す。時刻まで同じなら、登録の順に番号を付ける。
export function buildLinkTargetHints(
	targets: readonly RecipeLinkTarget[],
): Map<string, string> {
	const groups = new Map<string, RecipeLinkTarget[]>();

	for (const target of targets) {
		const key = target.name.trim();

		groups.set(key, [...(groups.get(key) ?? []), target]);
	}

	const hints = new Map<string, string>();

	for (const group of groups.values()) {
		if (group.length < 2) {
			continue;
		}

		const dates = group.map((target) =>
			dateFormat.format(new Date(target.createdAt)),
		);
		const times = group.map((target) =>
			dateTimeFormat.format(new Date(target.createdAt)),
		);
		const ordered = [...group].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);

		for (const [index, target] of group.entries()) {
			const date = dates[index] ?? "";
			const time = times[index] ?? "";
			const sameDay = dates.filter((other) => other === date).length > 1;
			const sameMinute = times.filter((other) => other === time).length > 1;

			if (!sameDay) {
				hints.set(target.publicId, `${date} 登録`);
			} else if (!sameMinute) {
				hints.set(target.publicId, `${time} 登録`);
			} else {
				hints.set(
					target.publicId,
					`${time} 登録（${ordered.indexOf(target) + 1}つ目）`,
				);
			}
		}
	}

	return hints;
}

// 候補の表示名。見分けが必要なときだけ、登録日などを添える。
export function formatLinkTargetLabel(
	target: RecipeLinkTarget,
	hints: ReadonlyMap<string, string>,
): string {
	const hint = hints.get(target.publicId);

	return hint ? `${target.name} ・ ${hint}` : target.name;
}
