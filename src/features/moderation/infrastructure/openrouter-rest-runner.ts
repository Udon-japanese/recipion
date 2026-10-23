import type { AiRunner } from "../application/ai-judge";

type OpenRouterRunnerConfig = {
	apiKey: string;
	// 例：google/gemma-4-26b-a4b-it（末尾に :free を付けると無料枠。モデルの ID は、OpenRouter のモデル一覧で確認する）。
	model: string;
	// 429（1分あたりの上限など）のとき、待って、やり直す回数。
	maxRetries?: number;
	// 429 に Retry-After がないときの待ち時間（ミリ秒）。
	defaultRetryDelayMs?: number;
	wait?: (ms: number) => Promise<void>;
	fetchImpl?: typeof fetch;
};

// OpenRouter を、REST で呼ぶ（評価用。Workers AI と同じモデルを、別の事業者で試すため）。
// 公式：https://openrouter.ai/docs/api-reference/chat-completion
export function createOpenRouterRestRunner({
	apiKey,
	model,
	maxRetries = 3,
	defaultRetryDelayMs = 5000,
	wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
	fetchImpl = fetch,
}: OpenRouterRunnerConfig): AiRunner {
	return async ({ messages }) => {
		for (let attempt = 0; ; attempt += 1) {
			const response = await fetchImpl(
				"https://openrouter.ai/api/v1/chat/completions",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model,
						messages,
						max_tokens: 1024,
						temperature: 0,
						// 答える前の「思考」を切る（Workers AI の評価に合わせる）。
						reasoning: { effort: "none" },
					}),
				},
			);

			if (response.status === 429 && attempt < maxRetries) {
				const retryAfterSeconds = Number(response.headers.get("Retry-After"));

				await wait(
					Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
						? retryAfterSeconds * 1000
						: defaultRetryDelayMs,
				);
				continue;
			}

			if (!response.ok) {
				// 原因が分かるよう、応答の本文（エラーの文）も、残す。
				const detail = (await response.text().catch(() => "")).slice(0, 300);

				throw new Error(
					`OpenRouter の呼び出しに失敗しました（${response.status}）${detail}`,
				);
			}

			const body = (await response.json()) as {
				choices?: { message?: { content?: unknown } }[];
			};
			const text = body.choices?.[0]?.message?.content;

			if (typeof text !== "string") {
				throw new Error("OpenRouter の応答の形が、想定と違います");
			}

			return text;
		}
	};
}
