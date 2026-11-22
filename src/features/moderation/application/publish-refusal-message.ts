import { excerptAt, listJudgedItems } from "../domain/moderation-location";
import type { ModerationReason } from "../domain/moderation-result";
import { moderationCategoryLabels } from "../domain/moderation-result";
import {
	type ModerationItem,
	moderationTargets,
} from "../domain/moderation-target";
import type { PublishGuardResult } from "./publish-guard";

// 利用者に見せる、当たった場所の数の上限（多いときは「ほか○か所」）。
const maxListedPlaces = 3;

// 欄の名前。同じ欄が複数あるとき（材料・作り方など）は、何番目か。
function describeTarget(
	reason: ModerationReason,
	judged: readonly ModerationItem[],
): string {
	const { label } = moderationTargets[reason.target];
	const itemIndex = reason.location?.item;

	if (itemIndex === undefined) {
		return label;
	}

	const sameTarget = judged.filter((item) => item.target === reason.target);

	if (sameTarget.length <= 1) {
		return label;
	}

	const position = judged
		.slice(0, itemIndex + 1)
		.filter((item) => item.target === reason.target).length;

	return `${label}の${position}番目`;
}

type Place = {
	key: string;
	target: string;
	excerpt: string | null;
	categories: string[];
};

// 当たった場所ごとに、まとめる（同じ場所の、別の種類は、1行に並べる）。
function collectPlaces(
	reasons: readonly ModerationReason[],
	items: readonly ModerationItem[],
): Place[] {
	const judged = listJudgedItems(items);
	const places = new Map<string, Place>();

	for (const reason of reasons) {
		const { location } = reason;
		const text =
			location === undefined ? undefined : judged[location.item]?.text;
		const excerpt =
			text === undefined || location === undefined
				? null
				: excerptAt(text, location);
		const key = `${reason.target}|${location?.item ?? ""}|${excerpt ?? ""}`;
		const category = moderationCategoryLabels[reason.category];
		const place = places.get(key) ?? {
			key,
			target: describeTarget(reason, judged),
			excerpt,
			categories: [],
		};

		if (!place.categories.includes(category)) {
			place.categories.push(category);
		}

		places.set(key, place);
	}

	return [...places.values()];
}

// 当たった場所の一覧（1か所に1行。「・作り方の3番目「…」（性的な内容）」）。
function describePlaces(
	reasons: readonly ModerationReason[],
	items: readonly ModerationItem[],
): string {
	const places = collectPlaces(reasons, items);
	const lines = places
		.slice(0, maxListedPlaces)
		.map(
			(place) =>
				`・${place.target}${place.excerpt === null ? "" : `「${place.excerpt}」`}（${place.categories.join("、")}）`,
		);

	if (places.length > maxListedPlaces) {
		lines.push(`・ほか${places.length - maxListedPlaces}か所`);
	}

	return lines.join("\n");
}

// 公開を止めた結果を、利用者に見せる文にする。当たった場所は、利用者が書いた文章の、その行（長い行は、前後の数文字）を見せる。
// 一覧の語そのものは見せない（利用者の文章だけを見せる）。公開してよいときは null。
export function describePublishRefusal(
	result: PublishGuardResult,
	items: readonly ModerationItem[] = [],
): string | null {
	switch (result.status) {
		case "ok":
		case "flagged":
			return null;
		case "suspended":
			return "アカウントが停止されています。";
		case "locked-today":
			return "今日は公開できなくなっています。日本時間の0時を過ぎてからお試しください。";
		case "ai-limit":
			return "今日の、内容の確認の上限に達しました。明日お試しください。";
		case "unavailable":
			return "いま内容の確認ができません。時間をおいてお試しください。";
		case "rejected": {
			const places = describePlaces(result.reasons, items);
			const base = "公開できない内容が含まれています。";

			switch (result.warning) {
				case "warned":
					return `${base}次に公開できない内容を送ると、今日は公開ができなくなります。\n${places}`;
				case "locked":
					return `${base}今日はこれ以上公開できません。\n${places}`;
				case "suspended":
					return `${base}繰り返されたため、アカウントを停止しました。\n${places}`;
				default:
					return `${base}内容を直してからもう一度お試しください。\n${places}`;
			}
		}
	}
}

// 「怪しい」を、断る欄（onFlag: reject）で出たとき、利用者に見せる文。
export function describeFlagRefusal(
	reasons: readonly ModerationReason[],
	items: readonly ModerationItem[] = [],
): string {
	return `使えない内容が含まれている可能性があります。別の内容にしてください。\n${describePlaces(reasons, items)}`;
}

// 管理者の画面に載せる、自動検知の説明（欄・何番目か・種類。文章は含まない。管理者は、レシピを開いて見る）。
export function describeFlagReasons(
	reasons: readonly ModerationReason[],
	items: readonly ModerationItem[] = [],
): string {
	const judged = listJudgedItems(items);

	return [
		...new Set(
			reasons.map(
				(reason) =>
					`${describeTarget(reason, judged)}（${moderationCategoryLabels[reason.category]}）`,
			),
		),
	].join("、");
}
