// レシピの本文に書く、他のレシピへのリンク（[[名前]]）の扱い（純粋な関数）。
// 本文には [[ラベル]] のまま書き、どのレシピを指すかは、別に持つ（recipe_link）。相手のレシピの名前を変えても、リンクは切れない。

export const linkLabelMaxLength = 100;
export const maxLinksPerRecipe = 50;

// 保存するリンク（どのラベルが、どのレシピを指すか）。
export type RecipeLinkReference = {
	label: string;
	targetPublicId: string;
};

// 表示するときのリンク。相手が見つからない（削除された、見られない）ときは、target が null。
export type RecipeLinkView = {
	label: string;
	target: { publicId: string; name: string } | null;
};

export type TextSegment =
	| { type: "text"; text: string }
	| { type: "link"; label: string };

// [[ と ]] の間は、括弧と改行を含まない1文字以上。
function createLinkPattern(): RegExp {
	return /\[\[([^[\]\n]+)\]\]/gu;
}

// ラベルを整える（前後の空白を除く）。
export function normalizeLinkLabel(label: string): string {
	return label.trim();
}

// ラベルとして使えるか（空でない、長すぎない、括弧と改行を含まない）。
export function isValidLinkLabel(label: string): boolean {
	return (
		label !== "" &&
		[...label].length <= linkLabelMaxLength &&
		!/[[\]\n\r]/u.test(label) &&
		label === normalizeLinkLabel(label)
	);
}

// 本文のリンクの書き方。
export function formatLink(label: string): string {
	return `[[${normalizeLinkLabel(label)}]]`;
}

// 本文を、文章とリンクに分ける。ラベルが使えない書き方（空白だけなど）は、文章のまま。
export function splitTextByLinks(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	let position = 0;

	for (const match of text.matchAll(createLinkPattern())) {
		const label = normalizeLinkLabel(match[1] ?? "");
		const start = match.index ?? 0;

		if (!isValidLinkLabel(label)) {
			continue;
		}

		if (start > position) {
			segments.push({ type: "text", text: text.slice(position, start) });
		}

		segments.push({ type: "link", label });
		position = start + match[0].length;
	}

	if (position < text.length) {
		segments.push({ type: "text", text: text.slice(position) });
	}

	return segments;
}

// 複数の文章に出てくるリンクのラベル（重複を除いて、出てきた順）。
export function extractLinkLabels(texts: readonly string[]): string[] {
	const labels = new Set<string>();

	for (const text of texts) {
		for (const segment of splitTextByLinks(text)) {
			if (segment.type === "link") {
				labels.add(segment.label);
			}
		}
	}

	return [...labels];
}
