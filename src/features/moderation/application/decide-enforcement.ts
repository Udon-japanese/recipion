import type { ModerationReason } from "../domain/moderation-result";
import type { ModerationTargetKind } from "../domain/moderation-target";
import { moderationTargets } from "../domain/moderation-target";
import type { PublishGuardResult } from "./publish-guard";
import {
	describeFlagRefusal,
	describePublishRefusal,
} from "./publish-refusal-message";

// 審査の結果を、保存してよいか（allowed）、断るか（refused）に決める。欄ごとの方針（onFlag）は、登録簿から読む。
export type ModerationEnforcement =
	| {
			status: "allowed";
			// 「怪しい」と判定され、通した欄の理由（管理者の画面に載せる）。なければ null。
			flagged: ModerationReason[] | null;
	  }
	| {
			status: "refused";
			// 利用者に見せる文。
			message: string;
			// 断る原因になった欄（呼び出し側が、画面の項目に対応づける）。全体の理由（停止中・上限など）のときは、空。
			targets: ModerationTargetKind[];
	  };

export function decideEnforcement(
	result: PublishGuardResult,
): ModerationEnforcement {
	const refusal = describePublishRefusal(result);

	if (refusal !== null) {
		return {
			status: "refused",
			message: refusal,
			targets:
				result.status === "rejected"
					? [...new Set(result.reasons.map((reason) => reason.target))]
					: [],
		};
	}

	if (result.status !== "flagged") {
		return { status: "allowed", flagged: null };
	}

	// 「怪しい」を断る欄が、1つでもあれば、断る（違反の回数には、数えない）。
	const rejecting = result.reasons.filter(
		(reason) => moderationTargets[reason.target].onFlag === "reject",
	);

	if (rejecting.length > 0) {
		return {
			status: "refused",
			message: describeFlagRefusal(rejecting),
			targets: [...new Set(rejecting.map((reason) => reason.target))],
		};
	}

	return { status: "allowed", flagged: result.reasons };
}
