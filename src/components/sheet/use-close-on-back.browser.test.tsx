import { useState } from "react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { CornerSheet } from "../corner-sheet/corner-sheet";
import { ConfirmDialog } from "../dialog/confirm-dialog";
import { Sheet } from "./sheet";
import { installCloseOnBack } from "./use-close-on-back";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 戻る操作（popstate が届いて、積み直し・戻しの setTimeout まで終わるのを待つ）。
async function goBack() {
	window.history.back();
	await sleep(150);
}

// ルーターの代わり：ルーターの作る履歴（キーと番号）と、ルーターが受けた popstate を数える。
const routerPops = vi.fn();

// 主な入力が指か（(pointer: coarse) の答えを差し替える）。
let coarse = true;

// アプリと同じに、ルーターより先に置く。
beforeAll(() => installCloseOnBack());

beforeEach(() => {
	// 前のページ → 今のページ（ルーターが積んだもの）。
	window.history.pushState({ __TSR_key: "previous", __TSR_index: 0 }, "");
	window.history.pushState({ __TSR_key: "current", __TSR_index: 1 }, "");
	window.addEventListener("popstate", routerPops);
	routerPops.mockClear();
	coarse = true;
	const original = window.matchMedia.bind(window);

	vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
		query === "(pointer: coarse)"
			? ({ ...original(query), matches: coarse } as MediaQueryList)
			: original(query),
	);
});

afterEach(() => {
	window.removeEventListener("popstate", routerPops);
	vi.restoreAllMocks();
});

function SheetWithConfirm() {
	const [sheetOpen, setSheetOpen] = useState(true);
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<>
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="在庫の詳細">
				<button type="button" onClick={() => setConfirmOpen(true)}>
					削除する
				</button>
			</Sheet>
			<ConfirmDialog
				open={confirmOpen}
				title="削除しますか？"
				cancelLabel="やめる"
				confirmLabel="削除"
				onCancel={() => setConfirmOpen(false)}
				onConfirm={() => setConfirmOpen(false)}
			/>
		</>
	);
}

const sheet = () => document.querySelector('[aria-label="在庫の詳細"]');
const confirm = () => document.querySelector('[role="alertdialog"]');

it("戻る操作でシートが閉じ、ページは戻らない（ルーターにも届かない）", async () => {
	await render(<SheetWithConfirm />);
	await sleep(50);

	expect(window.history.state.__overlayDepth).toBe(1);

	await goBack();

	expect(sheet()?.getAttribute("data-state")).toBe("closed");
	expect(window.history.state).toMatchObject({ __TSR_key: "current" });
	expect(window.history.state.__overlayDepth).toBeUndefined();
	expect(routerPops).not.toHaveBeenCalled();

	// 次の戻るで、前のページへ（ルーターが受ける）。
	await goBack();

	expect(window.history.state).toMatchObject({ __TSR_key: "previous" });
	expect(routerPops).toHaveBeenCalledTimes(1);
});

it("ボタンで閉じたあと、戻ると前のページへ戻る（履歴が余らない）", async () => {
	await render(<SheetWithConfirm />);
	await sleep(50);

	document.querySelector<HTMLElement>('[aria-label="閉じる"]')?.click();
	await sleep(150);

	expect(window.history.state).toMatchObject({ __TSR_key: "current" });
	expect(window.history.state.__overlayDepth).toBeUndefined();

	await goBack();

	expect(window.history.state).toMatchObject({ __TSR_key: "previous" });
	expect(routerPops).toHaveBeenCalledTimes(1);
});

it("重なった2枚は、戻る1回で、上の確認だけが閉じる", async () => {
	await render(<SheetWithConfirm />);
	await sleep(50);

	[...document.querySelectorAll<HTMLElement>("button")]
		.find((button) => button.textContent === "削除する")
		?.click();
	await sleep(150);

	expect(confirm()).not.toBeNull();
	expect(window.history.state.__overlayDepth).toBe(2);

	await goBack();

	expect(confirm()).toBeNull();
	expect(sheet()?.getAttribute("data-state")).toBe("open");
	expect(window.history.state.__overlayDepth).toBe(1);

	await goBack();

	expect(sheet()?.getAttribute("data-state")).toBe("closed");
	expect(window.history.state.__overlayDepth).toBeUndefined();
	expect(routerPops).not.toHaveBeenCalled();
});

it("必ず選ぶ確認（onDismiss なし）は、戻っても閉じず、ページも戻らない", async () => {
	await render(
		<CornerSheet
			open
			title="どちらにしますか？"
			right={{ label: "決める", icon: "check", onClick: () => undefined }}
		>
			本文
		</CornerSheet>,
	);
	await sleep(50);

	await goBack();

	expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	expect(window.history.state).toMatchObject({
		__TSR_key: "current",
		__overlayDepth: 1,
	});
	expect(routerPops).not.toHaveBeenCalled();
});

it("PC（主な入力が指でない）では、履歴を積まない", async () => {
	coarse = false;
	await render(<SheetWithConfirm />);
	await sleep(50);

	expect(window.history.state).toEqual({
		__TSR_key: "current",
		__TSR_index: 1,
	});
});

it("閉じると同時にページを移っても、戻る1回で元のページへ戻る（残った履歴を飛ばす）", async () => {
	await render(<SheetWithConfirm />);
	await sleep(50);

	// メニューの「編集」など：閉じる操作と同じ操作の中で、ルーターが次のページを積む。
	document.querySelector<HTMLElement>('[aria-label="閉じる"]')?.click();
	window.history.pushState({ __TSR_key: "next", __TSR_index: 2 }, "");
	await sleep(150);

	expect(window.history.state).toMatchObject({ __TSR_key: "next" });

	await goBack();

	expect(window.history.state).toMatchObject({ __TSR_key: "current" });
	expect(window.history.state.__overlayDepth).toBeUndefined();
	// 元のページへの移動だけが、ルーターに届く。
	expect(routerPops).toHaveBeenCalledTimes(1);

	await goBack();

	expect(window.history.state).toMatchObject({ __TSR_key: "previous" });
});
