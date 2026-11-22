import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecipePassphraseSection } from "./recipe-passphrase-section";

describe("RecipePassphraseSection", () => {
	it("パスフレーズを表示する。作り直しは、確認の2段階", async () => {
		const user = userEvent.setup();
		const regeneratePassphrase = vi.fn(async () => "あたらしいぱすふれーず");

		render(
			<RecipePassphraseSection
				recipeName="肉じゃが"
				publicId="abc123"
				loadPassphrase={async () => "ねこりんごやまくるま"}
				regeneratePassphrase={regeneratePassphrase}
			/>,
		);

		expect(await screen.findByText("ねこりんごやまくるま")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "作り直す" }));

		expect(regeneratePassphrase).not.toHaveBeenCalled();

		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText(/新しいパスフレーズを入れないと/u),
		).toBeInTheDocument();

		await user.click(within(dialog).getByRole("button", { name: "作り直す" }));

		expect(regeneratePassphrase).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("あたらしいぱすふれーず"),
		).toBeInTheDocument();
	});

	describe("共有", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			Reflect.deleteProperty(navigator, "share");
			Reflect.deleteProperty(navigator, "canShare");
		});

		function renderSection() {
			render(
				<RecipePassphraseSection
					recipeName="肉じゃが"
					publicId="abc123"
					loadPassphrase={async () => "ねこりんご"}
					regeneratePassphrase={async () => null}
				/>,
			);
		}

		function stubShare(share: (data: ShareData) => Promise<void>) {
			Object.defineProperty(navigator, "share", {
				configurable: true,
				value: vi.fn(share),
			});

			return navigator.share as ReturnType<typeof vi.fn>;
		}

		it("Web Share API があれば、パスフレーズ入りのリンクで共有する（フラグメントに入り、クエリには入らない）", async () => {
			const user = userEvent.setup();
			const share = stubShare(async () => {});

			renderSection();
			await screen.findByText("ねこりんご");
			await user.click(screen.getByRole("button", { name: "共有" }));

			expect(share).toHaveBeenCalledTimes(1);
			const data = share.mock.calls[0]?.[0] as ShareData;
			const url = new URL(data.url ?? "");

			expect(url.pathname).toBe("/recipes/abc123");
			expect(url.search).toBe("");
			expect(decodeURIComponent(url.hash)).toBe("#p=ねこりんご");
			expect(data.title).toBe("肉じゃが");
			expect(data.text).toContain("パスフレーズ：ねこりんご");
		});

		it("Web Share API がなければ、リンクと文をコピーする", async () => {
			const user = userEvent.setup();

			renderSection();
			await screen.findByText("ねこりんご");
			await user.click(screen.getByRole("button", { name: "共有" }));

			const copied = await navigator.clipboard.readText();

			expect(copied).toContain("パスフレーズ：ねこりんご");
			expect(copied).toContain("/recipes/abc123#p=");
		});

		it("共有のシートをやめたとき（AbortError）は、コピーしない", async () => {
			const user = userEvent.setup();

			stubShare(async () => {
				throw new DOMException("canceled", "AbortError");
			});
			renderSection();
			await screen.findByText("ねこりんご");
			await navigator.clipboard.writeText("まえの内容");
			await user.click(screen.getByRole("button", { name: "共有" }));

			expect(await navigator.clipboard.readText()).toBe("まえの内容");
		});
	});
});
