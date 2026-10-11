import type { AiRunner } from "../application/ai-judge";
import { moderationModel, moderationRequestExtras } from "./moderation-model";

// Workers AI のバインディング（env.AI）の、必要な部分だけ。
export type AiBinding = {
	run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
};

// Worker の中で、Workers AI を、バインディングで呼ぶ（REST は、手元の評価用）。
export function createWorkersAiBindingRunner(
	binding: AiBinding,
	model: string = moderationModel,
): AiRunner {
	return async ({ messages }) => {
		const result = (await binding.run(model, {
			messages,
			[moderationRequestExtras.tokenLimitParam]: 1024,
			temperature: 0,
			...moderationRequestExtras.extraBody,
		})) as {
			response?: unknown;
			choices?: { message?: { content?: unknown } }[];
		} | null;
		const text =
			result?.response ?? result?.choices?.[0]?.message?.content ?? null;

		if (typeof text !== "string") {
			throw new Error("Workers AI の応答の形が、想定と違います");
		}

		return text;
	};
}
