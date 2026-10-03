const preparationMarkerPattern =
	/^(?:[-*・●◦]|□|☐|☑|✓|✔|\[\s*[xX]?\s*\])\s*(.+)$/u;

export function parseRecipePreparations(input: string): string[] {
	const lines = input
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const usesListMarkers = lines.some((line) =>
		preparationMarkerPattern.test(line),
	);

	if (!usesListMarkers) {
		return lines;
	}

	const preparations: string[] = [];
	let currentPreparationIndex: number | null = null;

	for (const line of lines) {
		const markerMatch = line.match(preparationMarkerPattern);

		if (markerMatch) {
			preparations.push(markerMatch[1].trim());
			currentPreparationIndex = preparations.length - 1;
			continue;
		}

		if (currentPreparationIndex === null) {
			preparations.push(line);
			currentPreparationIndex = preparations.length - 1;
			continue;
		}

		preparations[currentPreparationIndex] =
			`${preparations[currentPreparationIndex]}\n${line}`;
	}

	return preparations;
}
