// 引っ張り更新の見た目と判定の数値（純粋関数。DOM を触らない）。

// 指の移動量に対して、描く距離の割合（引っ張るほど重くなる）。
export const PULL_RESISTANCE = 0.6;
// 描く距離の上限（px）。
export const PULL_MAX_PX = 120;
// 描く距離がこれ以上になって離したら、更新する（px）。
export const PULL_THRESHOLD_PX = 80;
// 丸の直径（px）。
export const PULL_INDICATOR_SIZE_PX = 48;
// 更新中の最低の表示時間（ms）。速く終わっても、ちらつかせない。
export const PULL_MIN_LOADING_MS = 600;
// 戻りきるまでの時間（ms）。CSS の transition と合わせる。
export const PULL_LEAVE_MS = 360;

// 指の縦の移動量（下向きが正）から、描く距離を決める。上向きは 0。
export function pullDistance(deltaY: number): number {
	if (deltaY <= 0) {
		return 0;
	}

	return Math.min(deltaY * PULL_RESISTANCE, PULL_MAX_PX);
}

// 転がる車輪のように、描く距離（下りた長さ）に合わせて回す角度（0 以上 360 未満）。
export function rollAngleDeg(distance: number): number {
	const circumference = Math.PI * PULL_INDICATOR_SIZE_PX;

	return ((distance / circumference) * 360) % 360;
}

// 離したとき、更新するかどうか。
export function shouldRefresh(distance: number): boolean {
	return distance >= PULL_THRESHOLD_PX;
}

// 丸の上端からの位置（translateY）。距離 0 のときは、丸が画面の外（上）に隠れる。
export function indicatorOffsetPx(distance: number): number {
	return distance - PULL_INDICATOR_SIZE_PX - 12;
}
