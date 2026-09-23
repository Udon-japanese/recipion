const circledNumbers = [
	"①",
	"②",
	"③",
	"④",
	"⑤",
	"⑥",
	"⑦",
	"⑧",
	"⑨",
	"⑩",
	"⑪",
	"⑫",
	"⑬",
	"⑭",
	"⑮",
	"⑯",
	"⑰",
	"⑱",
	"⑲",
	"⑳",
] as const;

const numberedLinePattern = /^(\d+)(?:\s*[.):：、.-]\s*|\s+)(.+)$/u;

const standaloneNumberPattern = /^\d+\s*(?:[.):：、.-])?$/u;

const bulletedLinePattern = /^[・●◦\-*]\s*(.+)$/u;

function normalizeInstructionLine(line: string): string {
	const trimmedLine = line.trim();

	const circledNumberIndex = circledNumbers.findIndex((number) =>
		trimmedLine.startsWith(number),
	);

	if (circledNumberIndex >= 0) {
		return `${circledNumberIndex + 1}. ${trimmedLine.slice(1).trim()}`;
	}

	return trimmedLine.replace(
		/^([0-9０-９]+)([\s.．):）：:、-]*)/u,
		(_, number: string, separator: string) =>
			`${number.normalize("NFKC")}${separator.normalize("NFKC")}`,
	);
}

function hasListMarker(line: string): boolean {
	return (
		numberedLinePattern.test(line) ||
		standaloneNumberPattern.test(line) ||
		bulletedLinePattern.test(line)
	);
}

export function parseRecipeInstructions(input: string): string[] {
	const lines = input
		.split(/\r?\n/u)
		.map(normalizeInstructionLine)
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const usesListMarkers = lines.some(hasListMarker);

	if (!usesListMarkers) {
		return lines;
	}

	const instructions: string[] = [];
	let currentInstructionIndex: number | null = null;
	let startsAfterStandaloneNumber = false;

	for (const line of lines) {
		const numberedMatch = line.match(numberedLinePattern);

		if (numberedMatch) {
			instructions.push(numberedMatch[2].trim());
			currentInstructionIndex = instructions.length - 1;
			startsAfterStandaloneNumber = false;
			continue;
		}

		const bulletedMatch = line.match(bulletedLinePattern);

		if (bulletedMatch) {
			instructions.push(bulletedMatch[1].trim());
			currentInstructionIndex = instructions.length - 1;
			startsAfterStandaloneNumber = false;
			continue;
		}

		if (standaloneNumberPattern.test(line)) {
			currentInstructionIndex = null;
			startsAfterStandaloneNumber = true;
			continue;
		}

		if (startsAfterStandaloneNumber || currentInstructionIndex === null) {
			instructions.push(line);
			currentInstructionIndex = instructions.length - 1;
			startsAfterStandaloneNumber = false;
			continue;
		}

		instructions[currentInstructionIndex] =
			`${instructions[currentInstructionIndex]}\n${line}`;
	}

	return instructions;
}
