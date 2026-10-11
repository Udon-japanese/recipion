import type { ModerationItem } from "./moderation-target";

// 判定の結果を覚えておくときの版。語の一覧やプロンプトを大きく変えたら上げる（古い結果を使わなくなる）。
export const moderationVersion = "1";

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
			items
				.filter((item) => item.text.trim() !== "")
				.map((item) => [item.target, item.text]),
		]),
	);
}

export { sha256Hex };
