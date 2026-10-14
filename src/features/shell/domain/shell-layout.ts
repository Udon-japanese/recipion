// 画面の枠（ヘッダー・ナビ）を、パスに応じて決める。純粋関数。

export type ShellLayout = {
	// false なら、枠なし（ログイン画面など、自分で画面全体を作るもの）。
	frame: boolean;
	// スマホの下部ナビを出すか（買い物メモ・在庫・レシピの中だけ）。
	bottomNav: boolean;
};

const sectionPrefixes = ["/shopping", "/inventory", "/recipes"] as const;
const barePrefixes = ["/login", "/account-deleted", "/dev"] as const;

function startsWithSegment(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getShellLayout(pathname: string): ShellLayout {
	if (barePrefixes.some((prefix) => startsWithSegment(pathname, prefix))) {
		return { frame: false, bottomNav: false };
	}

	return {
		frame: true,
		bottomNav: sectionPrefixes.some((prefix) =>
			startsWithSegment(pathname, prefix),
		),
	};
}
