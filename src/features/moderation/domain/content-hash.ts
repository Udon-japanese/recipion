import { listJudgedItems } from "./moderation-location";
import type { ModerationItem } from "./moderation-target";

// 判定の結果を覚えておくときの版。語の一覧やプロンプトを大きく変えたら上げる（古い結果を使わなくなる）。
// 2：名前の欄（表示名・ハンドル）で、レシピとの関係（irrelevant）を問わなくした。
// 3：判定の理由に、当たった場所（何番目の文章の、何文字目か）を持たせた。
// 4：審査への指示の言い回しを、注意する語にした（前に通った同じ文章も、判定し直す）。
// 5：注意する語で、AI が ok でも怪しいにするのは、審査への指示だけにした。
export const moderationVersion = "5";

async function sha256Hex(text: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);

	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

// 同じ内容の再判定を避けるための、判定対象のハッシュ。文章そのものは、保存しない。
export async function hashModerationItems(
	items: readonly ModerationItem[],
): Promise<string> {
	return sha256Hex(
		JSON.stringify([
			moderationVersion,
			listJudgedItems(items).map((item) => [item.target, item.text]),
		]),
	);
}

export { sha256Hex };
