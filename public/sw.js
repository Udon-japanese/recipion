// ビルドごとに scripts/postbuild-app-shell.ts が生成する。
// self.__APP_BUILD__ = { id: ビルド ID, urls: 今回のビルドが出したファイルの一覧, shellPages: 静的シェルの写しの画面 }
importScripts("/sw-build.js");

const {
	id: BUILD_ID,
	urls: BUILD_URLS,
	shellPages: SHELL_PAGES,
} = self.__APP_BUILD__;

// キャッシュ名にビルド ID を含める。新しいビルドのサービスワーカーが有効になると、2つ前より古いビルドのキャッシュを消す。
const CACHE_PREFIX = "recipion-build-";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;

// ルートだけを描画した、誰のセッション情報も含まない静的シェル（ビルド時に dist/client/_shell.html として生成）。
// 配信側（Cloudflare Workers のアセット）は .html を外した /_shell を正規の URL とし、/_shell.html は 307 で転送する。
// リダイレクト済みの応答はナビゲーションに返せないため、転送先の URL を直接使う。
const SHELL_URL = "/_shell";
const STATIC_URLS = ["/manifest.webmanifest", "/recipion-icon.svg"];

// 画面を開くとき、ネットワークを待つ時間の上限（Workbox の NetworkFirst の networkTimeoutSeconds と同じ考え方）。
// 電波が弱い（つながるが届かない）ときに、接続のタイムアウト（数十秒）まで待たず、キャッシュで開く。
// 値は仮。実機（Android の弱い電波）で計測して決める。
const NAVIGATION_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			// 1つでも取得できなければ、インストールは失敗し、古いサービスワーカーが使われ続ける。
			await cache.addAll(
				[SHELL_URL, ...SHELL_PAGES, ...STATIC_URLS, ...BUILD_URLS].map(
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
			// keys() は、作った順（MDN）。今のビルドと、その1つ前だけを残す。
			// 1つ前を残すのは、更新の前から開いている画面が、あとから読み込む前のビルドのファイル（/assets/）を、まだ使うため。
			const buildCaches = (await caches.keys()).filter(
				(cacheName) =>
					cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME,
			);

			await Promise.all(
				buildCaches.slice(0, -1).map((cacheName) => caches.delete(cacheName)),
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
		event.respondWith(handleNavigation(request, url));

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

// 画面の HTML は、今のビルドのキャッシュだけから探す（caches.match は、古いキャッシュから順に探すため。MDN）。
// 前のビルドの HTML は、今のビルドのファイルと合わない。
async function matchCurrentBuild(url) {
	return caches.match(url, { cacheName: CACHE_NAME, ignoreVary: true });
}

// ネットワークで開けなかったときの画面：その画面の静的な写しがあれば、それ。なければ、静的シェル。
async function cachedNavigation(url) {
	const page = SHELL_PAGES.includes(url.pathname)
		? await matchCurrentBuild(url.pathname)
		: undefined;

	return (
		page ??
		(await matchCurrentBuild(SHELL_URL)) ??
		new Response("オフラインでアプリを起動できませんでした", {
			status: 503,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		})
	);
}

function waitFor(milliseconds) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(null), milliseconds);
	});
}

// 画面を開く（ナビゲーション）。ネットワークを先に見る（オンラインなら、いつも最新）。
// - 端末がオフラインと分かっているとき（navigator.onLine が false）：待たずに、キャッシュ。
//   MDN のとおり onLine は目安なので、待つのをやめる判断にだけ使う。
// - 届かない・NAVIGATION_TIMEOUT_MS を過ぎた：キャッシュ。
// - サーバーが HTTP のエラー（メンテナンスの 503 など）を返した：そのまま返す（届いてはいるので）。
// 届いた HTML は、キャッシュに入れ直さない。サーバーのほうが新しいビルドのとき、今のビルドのファイルと合わない HTML が
// キャッシュに入ってしまうため（HTML は、ビルドごとに install で取り直す）。
async function handleNavigation(request, url) {
	if (!self.navigator.onLine) {
		return cachedNavigation(url);
	}

	try {
		const response = await Promise.race([
			fetch(request),
			waitFor(NAVIGATION_TIMEOUT_MS),
		]);

		return response ?? (await cachedNavigation(url));
	} catch {
		return cachedNavigation(url);
	}
}
