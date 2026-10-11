// AI への指示に足す、追加の注意（隠語・ネットスラングなど）。
// 具体的な語は、リポジトリに入れず、手元だけの prompt-extra.local.ts に置く（default で文字列を書き出す。あれば、取り込む。なければ、空）。
const localModules = import.meta.glob<{ default: string }>(
	"./prompt-extra.local.ts",
	{ eager: true },
);

export const promptExtra: string = Object.values(localModules)
	.map((module) => module.default.trim())
	.filter((text) => text !== "")
	.join("\n");
