const SHELL_CACHE = "recipion-shell-v1";
const ASSET_CACHE = "recipion-assets-v1";

async function cacheAppShell() {
	const response = await fetch(
		new Request("/", {
			cache: "reload",
		}),
	);

	if (!response.ok) {
		return;
	}

	const html = await response.clone().text();
	const shellCache = await caches.open(SHELL_CACHE);

	await shellCache.put("/", response);

	const assetUrls = [
		...html.matchAll(
			/(?:src|href)="(\/assets\/[^"]+)"/g,
		),
	].map((match) => match[1]);

	const assetCache = await caches.open(ASSET_CACHE);

	await Promise.allSettled(
		[...new Set(assetUrls)].map((url) =>
			assetCache.add(url),
		),
	);
}

self.addEventListener("install", (event) => {
	event.waitUntil(
		cacheAppShell()
			.catch(() => undefined)
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		Promise.all([
			self.clients.claim(),
			caches.keys().then((cacheNames) =>
				Promise.all(
					cacheNames
						.filter(
							(cacheName) =>
								cacheName !== SHELL_CACHE &&
								cacheName !== ASSET_CACHE,
						)
						.map((cacheName) =>
							caches.delete(cacheName),
						),
				),
			),
		]),
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
		event.respondWith(
			fetch(request)
				.then(async (response) => {
					if (response.ok) {
						const cache =
							await caches.open(
								SHELL_CACHE,
							);

						await cache.put(
							"/",
							response.clone(),
						);
					}

					return response;
				})
				.catch(async () => {
					const cachedResponse =
						await caches.match("/");

					return (
						cachedResponse ??
						new Response(
							"オフラインでアプリを起動できませんでした",
							{
								status: 503,
								headers: {
									"Content-Type":
										"text/plain; charset=utf-8",
								},
							},
						)
					);
				}),
		);

		return;
	}

	if (
		url.pathname.startsWith("/assets/") ||
		url.pathname === "/manifest.webmanifest" ||
		url.pathname === "/recipion-icon.svg"
	) {
		event.respondWith(
			caches.match(request).then((cachedResponse) => {
				if (cachedResponse) {
					return cachedResponse;
				}

				return fetch(request).then(
					async (response) => {
						if (response.ok) {
							const cache =
								await caches.open(
									ASSET_CACHE,
								);

							await cache.put(
								request,
								response.clone(),
							);
						}

						return response;
					},
				);
			}),
		);
	}
});