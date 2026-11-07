import {
	classifyRequestError,
	type RequestFailureKind,
} from "#/errors/classify-request-error";

type UserScope = `user:${string}`;

// 同期を頼んだきっかけ。
// - write：端末で書いた（送る印が増えた）。同期の最中なら、終わったあとに、必ずもう1回同期する。
// - wake：開いた・ウィンドウに戻った・画面が見えた/隠れた・通信が戻った・送り直し。
//   同期の最中なら、その同期で送り・受け取るので、もう1回はしない（focus と visibilitychange が続けて来ても、1回にまとまる）。
export type ShoppingSyncReason = "write" | "wake";

export type ShoppingSyncRequester = (
	ownerScope: UserScope,
	reason: ShoppingSyncReason,
) => Promise<RequestFailureKind | null>;

type RequesterOptions = {
	// 1回の同期（送る → 受け取る）。
	syncOnce: (ownerScope: UserScope) => Promise<unknown>;
	onStart?: (ownerScope: UserScope) => void;
	onSettled?: (
		ownerScope: UserScope,
		failure: RequestFailureKind | null,
	) => void;
	classify?: (error: unknown) => RequestFailureKind;
};

// 同期の頼み方を、持ち主ごとに1本にまとめる。結果は、失敗の種類（成功は null）。例外にはしない。
// 「もう1回」を確かめてから「同期の最中」の記録を消すまでを、同じ同期の流れの中で行う（その間に来た依頼を落とさない）。
// 失敗したら、もう1回はせずに止める（送り直すかは、呼び出す側が、失敗の種類で決める）。
export function createShoppingSyncRequester({
	syncOnce,
	onStart,
	onSettled,
	classify = classifyRequestError,
}: RequesterOptions): ShoppingSyncRequester {
	// 同期の最中の持ち主（again：最中に書いた依頼が来た）。
	const running = new Map<
		UserScope,
		{ again: boolean; promise: Promise<RequestFailureKind | null> | null }
	>();

	async function run(
		ownerScope: UserScope,
		state: { again: boolean },
	): Promise<RequestFailureKind | null> {
		let failure: RequestFailureKind | null = null;

		try {
			do {
				state.again = false;

				try {
					await syncOnce(ownerScope);
					failure = null;
				} catch (error) {
					failure = classify(error);
				}
			} while (state.again && failure === null);

			return failure;
		} finally {
			// ここまでは、同じ流れの中で続けて動く（again を確かめてから、記録を消すまでの間に、ほかの依頼は割り込めない）。
			running.delete(ownerScope);
			onSettled?.(ownerScope, failure);
		}
	}

	return (ownerScope, reason) => {
		const current = running.get(ownerScope);

		if (current) {
			if (reason === "write") {
				current.again = true;
			}

			return current.promise ?? Promise.resolve(null);
		}

		onStart?.(ownerScope);

		const state: {
			again: boolean;
			promise: Promise<RequestFailureKind | null> | null;
		} = { again: false, promise: null };

		running.set(ownerScope, state);

		const promise = run(ownerScope, state);

		state.promise = promise;

		return promise;
	};
}
