import { createHash } from "node:crypto";

// Vite の client ビルドが出す .vite/manifest.json の1項目（使う項目だけ）。
export type ViteManifestEntry = {
	file: string;
	css?: string[];
	assets?: string[];
};

// 今回のビルドが出したファイルだけを列挙する。
// dist/client/assets には過去のビルドの古いファイルが残るため、ディレクトリの一覧は使わない。
export function collectPrecacheUrls(
	manifest: Readonly<Record<string, ViteManifestEntry>>,
): string[] {
	const files = new Set<string>();

	for (const entry of Object.values(manifest)) {
		files.add(entry.file);

		for (const file of entry.css ?? []) files.add(file);
		for (const file of entry.assets ?? []) files.add(file);
	}

	return [...files].sort().map((file) => `/${file}`);
}

export function createBuildId(parts: readonly string[]): string {
	const hash = createHash("sha256");

	for (const part of parts) {
		hash.update(part);
		hash.update("\0");
	}

	return hash.digest("hex").slice(0, 12);
}

// sw.js が importScripts で読む、ビルドごとのファイル。
// 中身（ビルド ID）が変わるので、ブラウザがサービスワーカーの更新を検出する。
export function renderBuildScript(id: string, urls: readonly string[]): string {
	return `self.__APP_BUILD__ = ${JSON.stringify({ id, urls })};\n`;
}

// 静的シェルが「ルートだけの骨組み」であることの確認。
// ページの内容（ホームのリンクなど）や、ユーザーごとの情報が入っていたら、キャッシュしてはいけない。
export function findShellProblems(html: string): string[] {
	const problems: string[] = [];

	if (!html.includes("<html")) {
		problems.push("HTML ではありません");
	}

	if (html.includes('href="/shopping"')) {
		problems.push(
			"ページの内容が含まれています（シェルとして描画されていません）",
		);
	}

	if (/initialSession:\s*\{\s*user:/u.test(html)) {
		problems.push("ユーザーのセッション情報が含まれています");
	}

	if (/initialSession:\s*null/u.test(html)) {
		problems.push(
			"initialSession が null です（シェルでは undefined にする必要があります）",
		);
	}

	return problems;
}
