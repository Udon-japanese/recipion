import { APP_DISPLAY_NAME } from "./app";
import teapotHtml from "./teapot-418.html?raw";

// 418 I'm a teapot（RFC 2324 の冗談のステータス）。/teapot を開いたときの応答。
// 自己完結の 1 枚のページ（れしぽよがお茶を注ぐ。小さな JavaScript つき）。Worker を通る応答なので、ブラウザには少しだけ（5 分）保存させる（長くすると、メンテ中などで応答が変わっても、古い画面が見え続ける）。許可リストにない、ほかのパスは、WAF が 403 で止める。
export function createTeapotResponse(): Response {
	return new Response(
		teapotHtml.replaceAll("{{APP_NAME}}", () => APP_DISPLAY_NAME),
		{
			status: 418,
			headers: {
				"content-type": "text/html; charset=utf-8",
				"cache-control": "public, max-age=300",
				// 検索エンジンには載せない。
				"x-robots-tag": "noindex, nofollow",
			},
		},
	);
}
