import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnstileWidget } from "./turnstile-widget";

type RenderParams = {
	sitekey: string;
	language: string;
	callback: (token: string) => void;
	"error-callback": () => void;
	"expired-callback": () => void;
};

function installFakeTurnstile() {
	const render = vi.fn(
		(_container: HTMLElement, _params: RenderParams) => "widget-1",
	);
	const reset = vi.fn();
	const remove = vi.fn();

	window.turnstile = { render, reset, remove };

	return { render, reset, remove };
}

beforeEach(() => {
	// 読み込み済み（window.turnstile がある）状態にして、外部のスクリプトを読み込まない。
});

afterEach(() => {
	cleanup();
	window.turnstile = undefined;
});

describe("TurnstileWidget", () => {
	it("サイトキーと日本語の設定でウィジェットを作り、得たトークンを知らせる", async () => {
		const fake = installFakeTurnstile();
		const onToken = vi.fn();

		render(
			<TurnstileWidget siteKey="site-key" onToken={onToken} resetKey={0} />,
		);

		await vi.waitFor(() => expect(fake.render).toHaveBeenCalledTimes(1));

		const params = fake.render.mock.calls[0]?.[1] as RenderParams;

		expect(params.sitekey).toBe("site-key");
		expect(params.language).toBe("ja");

		params.callback("token-1");
		expect(onToken).toHaveBeenLastCalledWith("token-1");

		// 失効やエラーのときは、トークンを null に戻す
		params["expired-callback"]();
		expect(onToken).toHaveBeenLastCalledWith(null);
		params["error-callback"]();
		expect(onToken).toHaveBeenLastCalledWith(null);
	});

	it("resetKey が変わったら、ウィジェットを作り直し、トークンを null に戻す", async () => {
		const fake = installFakeTurnstile();
		const onToken = vi.fn();

		const { rerender } = render(
			<TurnstileWidget siteKey="site-key" onToken={onToken} resetKey={0} />,
		);

		await vi.waitFor(() => expect(fake.render).toHaveBeenCalledTimes(1));
		onToken.mockClear();

		rerender(
			<TurnstileWidget siteKey="site-key" onToken={onToken} resetKey={1} />,
		);

		expect(fake.reset).toHaveBeenCalledWith("widget-1");
		expect(onToken).toHaveBeenCalledWith(null);
	});

	it("画面から外れたら、ウィジェットを取り除く", async () => {
		const fake = installFakeTurnstile();

		const { unmount } = render(
			<TurnstileWidget siteKey="site-key" onToken={() => {}} resetKey={0} />,
		);

		await vi.waitFor(() => expect(fake.render).toHaveBeenCalledTimes(1));
		unmount();

		expect(fake.remove).toHaveBeenCalledWith("widget-1");
	});
});
