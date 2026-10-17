import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// メールの JSX を、HTML の文字列にする（React の描画を、このアプリはすでにサーバーで使っている）。
export function renderEmail(element: ReactElement): string {
	return `<!doctype html>${renderToStaticMarkup(element)}`;
}
