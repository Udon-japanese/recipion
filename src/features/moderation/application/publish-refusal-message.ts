import type { ModerationReason } from "../domain/moderation-result";
import { moderationCategoryLabels } from "../domain/moderation-result";
import type { ModerationTargetKind } from "../domain/moderation-target";
import type { PublishGuardResult } from "./publish-guard";

const targetLabels: Record<ModerationTargetKind, string> = {
	"recipe-title": "タイトル",
	"recipe-ingredient": "材料",
	"recipe-preparation": "下準備",
	"recipe-instruction": "作り方",
	"recipe-note": "メモ",
	"recipe-link-label": "リンクの名前",
	"profile-display-name": "表示名",
	"profile-handle": "ハンドル",
};

function describeTargets(reasons: readonly ModerationReason[]): string {
	return [
		...new Set(reasons.map((reason) => targetLabels[reason.target])),
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
			return "今日は、公開できなくなっています。日本時間の0時を過ぎてから、お試しください。";
		case "ai-limit":
			return "今日の、内容の確認の上限に達しました。明日、お試しください。";
		case "unavailable":
			return "いま、内容の確認ができません。時間をおいて、お試しください。";
		case "rejected": {
			const base = `公開できない内容が含まれています（${describeTargets(result.reasons)}）。`;

			switch (result.warning) {
				case "warned":
					return `${base}次に公開できない内容を送ると、今日は、公開ができなくなります。`;
				case "locked":
					return `${base}今日は、これ以上、公開できません。`;
				case "suspended":
					return `${base}繰り返されたため、アカウントを停止しました。`;
				default:
					return `${base}内容を直してから、もう一度お試しください。`;
			}
		}
	}
}

// 管理者の画面に載せる、自動検知の説明（欄と種類だけ。語は含まない）。
export function describeFlagReasons(
	reasons: readonly ModerationReason[],
): string {
	return [
		...new Set(
			reasons.map(
				(reason) =>
					`${targetLabels[reason.target]}（${moderationCategoryLabels[reason.category]}）`,
			),
		),
	].join("、");
}
