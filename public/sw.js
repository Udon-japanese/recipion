// ビルドごとに scripts/postbuild-app-shell.ts が生成する。
// self.__APP_BUILD__ = { id: ビルド ID, urls: 今回のビルドが出したファイルの一覧 }
importScripts("/sw-build.js");

const { id: BUILD_ID, urls: BUILD_URLS } = self.__APP_BUILD__;

// キャッシュ名にビルド ID を含める。新しいビルドのサービスワーカーが有効になると、古いビルドのキャッシュはすべて消える。
const CACHE_NAME = `recipion-build-${BUILD_ID}`;

// ルートだけを描画した、誰のセッション情報も含まない静的シェル（ビルド時に dist/client/_shell.html として生成）。
// 配信側（Cloudflare Workers のアセット）は .html を外した /_shell を正規の URL とし、/_shell.html は 307 で転送する。
// リダイレクト済みの応答はナビゲーションに返せないため、転送先の URL を直接使う。
const SHELL_URL = "/_shell";
const STATIC_URLS = ["/manifest.webmanifest", "/recipion-icon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			// 1つでも取得できなければ、インストールは失敗し、古いサービスワーカーが使われ続ける。
			await cache.addAll(
				[SHELL_URL, ...STATIC_URLS, ...BUILD_URLS].map(
					(url) => new Request(url, { cache: "reload" }),
				),
			);

			await self.skipWaiting();
		})(),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const cacheNames = await caches.keys();

			await Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => caches.delete(cacheName)),
			);

			await self.clients.claim();
		})(),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	if (request.method !== "GET") {
		return;
	}

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) {
		return;
	}

	if (request.mode === "navigate") {
		// オンラインでは、これまでどおりサーバーの描画（SSR）を使う。
		// オフラインのときだけ、静的シェルを返す。
		event.respondWith(
			fetch(request).catch(async () => {
				const shell = await caches.match(SHELL_URL, { ignoreVary: true });

				return (
					shell ??
					new Response("オフラインでアプリを起動できませんでした", {
						status: 503,
						headers: { "Content-Type": "text/plain; charset=utf-8" },
					})
				);
			}),
		);

		return;
	}

	if (
		url.pathname.startsWith("/assets/") ||
		STATIC_URLS.includes(url.pathname)
	) {
		event.respondWith(
			// 配信側が Vary: Origin を付けるため、取得経路（CORS の有無）が違うと、
			// 同じ URL でも既定では一致しない。URL だけで照合する。
			caches
				.match(request, { ignoreVary: true })
				.then(async (cachedResponse) => {
					if (cachedResponse) {
						return cachedResponse;
					}

					const response = await fetch(request);

					if (response.ok) {
						const cache = await caches.open(CACHE_NAME);

						await cache.put(request, response.clone());
					}

					return response;
				}),
		);
	}
});
