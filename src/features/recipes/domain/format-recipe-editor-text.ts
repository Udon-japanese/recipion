// 保存済みの下準備・作り方を、エディタの入力欄（textarea）へ戻すための文字列にする。
// parseRecipePreparations / parseRecipeInstructions で読み戻すと、元の項目に戻る。
// 複数行の項目も、先頭に印を付けることで、1つの項目として戻る。

export function formatPreparationText(
	preparations: readonly { text: string }[],
): string {
	return preparations.map((preparation) => `- ${preparation.text}`).join("\n");
}

export function formatInstructionText(
	instructions: readonly { text: string }[],
): string {
	return instructions
		.map((instruction, index) => `${index + 1}. ${instruction.text}`)
		.join("\n");
}
