import type { AiRunner } from "../application/ai-judge";

type RestRunnerConfig = {
	accountId: string;
	apiToken: string;
	// 例：@cf/google/gemma-... （モデルの ID は、Workers AI のモデル一覧で確認する）
	model: string;
	// 応答の長さの上限の、パラメータ名（モデルによって違う。gemma 系は max_completion_tokens、qwen 系は max_tokens）。
	tokenLimitParam?: "max_tokens" | "max_completion_tokens";
	// モデルごとの、追加のパラメータ（例：gemma 系の「思考」を切る）。
	extraBody?: Record<string, unknown>;
	fetchImpl?: typeof fetch;
};

// Workers AI を、REST で呼ぶ（評価用のスクリプトなど、Worker の外から使う）。
// Worker の中では、バインディング（env.AI）を使う実装を、別に用意する。
export function createWorkersAiRestRunner({
	accountId,
	apiToken,
	model,
	tokenLimitParam = "max_tokens",
	extraBody = {},
	fetchImpl = fetch,
}: RestRunnerConfig): AiRunner {
	return async ({ messages }) => {
		const response = await fetchImpl(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					messages,
					[tokenLimitParam]: 1024,
					temperature: 0,
					...extraBody,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(
				`Workers AI の呼び出しに失敗しました（${response.status}）`,
			);
		}

		const body = (await response.json()) as {
			success?: boolean;
			result?: {
				response?: unknown;
				// OpenAI 互換の形で返すモデルもある。
				choices?: { message?: { content?: unknown } }[];
			};
		};
		const text =
			body.result?.response ?? body.result?.choices?.[0]?.message?.content;

		if (!body.success || typeof text !== "string") {
			throw new Error("Workers AI の応答の形が、想定と違います");
		}

		return text;
	};
}
