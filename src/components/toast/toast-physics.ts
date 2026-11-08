// お知らせを指で動かすときの計算（画面に依存しない純粋な関数）。
// 位置は、元の位置からのずれ（px）。上向きが負、下向きが正。速さは px/ms（下向きが正）。

// 上へ、これより多く動かして離すと、消す。
export const UP_DISMISS_DISTANCE = 24;
// 上へ、これより速くはじくと、短くても消す。
export const UP_DISMISS_VELOCITY = 0.4;
// 下へ引ける量の上限（ゴムのように重くなり、ここで止まる）。
export const DOWN_PULL_LIMIT = 28;
// 下へ、指でこれより多く引いて離すと、上へ消す。
export const DOWN_DISMISS_DISTANCE = 48;

/** 指の動き（生のずれ）から、描くずれを決める。上へはそのまま、下へはゴムのように重く、上限で止まる。 */
export function displayToastOffset(raw: number): number {
	if (raw <= 0) {
		return raw;
	}

	return DOWN_PULL_LIMIT * (1 - 1 / (raw / DOWN_PULL_LIMIT + 1));
}

/** 指を離したとき：消すか、元の位置へ戻すか。 */
export function resolveToastRelease(input: {
	raw: number;
	velocity: number;
}): "dismiss" | "stay" {
	if (input.raw <= -UP_DISMISS_DISTANCE) {
		return "dismiss";
	}

	if (input.velocity <= -UP_DISMISS_VELOCITY && input.raw < 0) {
		return "dismiss";
	}

	if (input.raw >= DOWN_DISMISS_DISTANCE) {
		return "dismiss";
	}

	return "stay";
}
