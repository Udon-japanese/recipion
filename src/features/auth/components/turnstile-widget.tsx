import { useEffect, useRef } from "react";

// Cloudflare Turnstile の明示的な描画（https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/）。
// トークンは、300 秒で失効し、1 回しか検証できない。使ったら、resetKey を変えて、作り直す。

type TurnstileRenderParams = {
	sitekey: string;
	callback: (token: string) => void;
	"error-callback": () => void;
	"expired-callback": () => void;
	language: string;
};

type TurnstileApi = {
	render(container: HTMLElement, params: TurnstileRenderParams): string;
	reset(widgetId: string): void;
	remove(widgetId: string): void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const SCRIPT_URL =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
	if (window.turnstile) return Promise.resolve(window.turnstile);

	scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
		const script = document.createElement("script");

		script.src = SCRIPT_URL;
		script.async = true;
		script.onload = () => {
			if (window.turnstile) {
				resolve(window.turnstile);
			} else {
				scriptPromise = null;
				reject(new Error("Turnstile を読み込めませんでした"));
			}
		};
		script.onerror = () => {
			scriptPromise = null;
			reject(new Error("Turnstile を読み込めませんでした"));
		};
		// Workers の型定義（HTMLRewriter の append）と衝突するため、appendChild を使う。
		document.head.appendChild(script);
	});

	return scriptPromise;
}

type TurnstileWidgetProps = {
	siteKey: string;
	// トークンを得たら、そのトークン。失効・エラー・作り直しのときは null。
	onToken: (token: string | null) => void;
	// 読み込みに失敗したとき（広告ブロックなど）。
	onLoadError?: () => void;
	// 値を変えると、ウィジェットを作り直す（トークンは 1 回しか使えないため、送信のたびに変える）。
	resetKey: number;
};

export function TurnstileWidget({
	siteKey,
	onToken,
	onLoadError,
	resetKey,
}: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);
	const onTokenRef = useRef(onToken);
	const onLoadErrorRef = useRef(onLoadError);

	useEffect(() => {
		onTokenRef.current = onToken;
		onLoadErrorRef.current = onLoadError;
	});

	useEffect(() => {
		let cancelled = false;

		loadTurnstile()
			.then((api) => {
				if (cancelled || !containerRef.current) return;

				widgetIdRef.current = api.render(containerRef.current, {
					sitekey: siteKey,
					language: "ja",
					callback: (token) => onTokenRef.current(token),
					"error-callback": () => onTokenRef.current(null),
					"expired-callback": () => onTokenRef.current(null),
				});
			})
			.catch(() => {
				if (!cancelled) onLoadErrorRef.current?.();
			});

		return () => {
			cancelled = true;

			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
			}

			widgetIdRef.current = null;
		};
	}, [siteKey]);

	// resetKey が変わったら、既存のウィジェットを reset() する
	useEffect(() => {
		if (resetKey === 0) return;

		if (widgetIdRef.current && window.turnstile) {
			window.turnstile.reset(widgetIdRef.current);
		}

		onTokenRef.current(null);
	}, [resetKey]);

	return <div ref={containerRef} />;
}
