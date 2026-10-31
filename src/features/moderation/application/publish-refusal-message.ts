import type { ModerationReason } from "../domain/moderation-result";
import { moderationCategoryLabels } from "../domain/moderation-result";
import { moderationTargets } from "../domain/moderation-target";
import type { PublishGuardResult } from "./publish-guard";

function describeTargets(reasons: readonly ModerationReason[]): string {
	return [
		...new Set(reasons.map((reason) => moderationTargets[reason.target].label)),
	].join("、");
}

// 公開を止めた結果を、利用者に見せる文にする（止めた語は、見せない）。公開してよいときは null。
export function describePublishRefusal(
	result: PublishGuardResult,
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
			const base = `公開できない内容が含まれています（${describeTargets(result.reasons)}）。`;

			switch (result.warning) {
				case "warned":
					return `${base}次に公開できない内容を送ると、今日は公開ができなくなります。`;
				case "locked":
					return `${base}今日はこれ以上公開できません。`;
				case "suspended":
					return `${base}繰り返されたため、アカウントを停止しました。`;
				default:
					return `${base}内容を直してからもう一度お試しください。`;
			}
		}
	}
}

// 「怪しい」を、断る欄（onFlag: reject）で出たとき、利用者に見せる文（止めた語は、見せない）。
export function describeFlagRefusal(
	reasons: readonly ModerationReason[],
): string {
	return `${describeTargets(reasons)}に使えない内容が含まれている可能性があります。別の内容にしてください。`;
}

// 管理者の画面に載せる、自動検知の説明（欄と種類だけ。語は含まない）。
export function describeFlagReasons(
	reasons: readonly ModerationReason[],
): string {
	return [
		...new Set(
			reasons.map(
				(reason) =>
					`${moderationTargets[reason.target].label}（${moderationCategoryLabels[reason.category]}）`,
			),
		),
	].join("、");
}
