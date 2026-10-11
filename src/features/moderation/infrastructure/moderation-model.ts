// 判定に使う Workers AI のモデルと、その追加の設定（評価 moderation-eval で選んだもの）。
export const moderationModel = "@cf/google/gemma-4-26b-a4b-it";

export const moderationRequestExtras = {
	// gemma 系は、max_completion_tokens。
	tokenLimitParam: "max_completion_tokens",
	// 「思考」を切る（思考に、応答の長さを使い切るのを避ける）。
	extraBody: { chat_template_kwargs: { enable_thinking: false } },
} as const;
