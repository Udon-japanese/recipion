// 無効のボタンの理由（吹き出し）を、切り取られない位置へ、横にずらす量。
// 吹き出しは、ボタンの真ん中にそろえて出す。端のボタンでは、シートのスクロール領域（overflow）や画面の外にはみ出して、
// 切れてしまうため、はみ出した分だけ内側へ戻す。両側ともはみ出すときは、文の頭（左）が見えるほうを優先する。
type HorizontalBox = { left: number; right: number };

export const REASON_EDGE_MARGIN = 8;

export function getReasonShift(
	bubble: HorizontalBox,
	bounds: HorizontalBox,
	margin = REASON_EDGE_MARGIN,
): number {
	const minLeft = bounds.left + margin;
	const maxRight = bounds.right - margin;

	if (bubble.left < minLeft) {
		return minLeft - bubble.left;
	}

	if (bubble.right > maxRight) {
		return Math.max(maxRight - bubble.right, minLeft - bubble.left);
	}

	return 0;
}

// 吹き出しを切り取る枠：overflow が visible でない祖先と、画面の幅の重なり。
export function findReasonBounds(element: HTMLElement): HorizontalBox {
	let left = 0;
	let right = document.documentElement.clientWidth;

	for (
		let ancestor = element.parentElement;
		ancestor && ancestor !== document.body;
		ancestor = ancestor.parentElement
	) {
		if (getComputedStyle(ancestor).overflowX === "visible") {
			continue;
		}

		const rect = ancestor.getBoundingClientRect();

		left = Math.max(left, rect.left);
		right = Math.min(right, rect.right);
	}

	return { left, right };
}
