// 補完の候補（ポップアップ）を、カーソルの近くに置く場所を決める（純粋な関数。座標は、画面（ビューポート）の左上が基準）。

export type CaretRect = { top: number; left: number; height: number };
export type Size = { width: number; height: number };

export type PopupPlacement = {
	top: number;
	left: number;
	side: "above" | "below";
	// 上に置くために縮めるときの、高さの上限（縮めないときは、なし）。
	maxHeight?: number;
};

type PlacePopupInput = {
	caret: CaretRect;
	popup: Size;
	viewport: Size;
	// 先に置こうとする側。入らなければ、反対側に置く。
	prefer: "above" | "below";
	// カーソルの行と、ポップアップの間のすき間。
	gap?: number;
	// 画面の端に残す余白。
	margin?: number;
	// 上を先にしたいのに入らないとき、この高さ以上の余白があれば、ポップアップを縮めて上に置く。
	minShrunkHeight?: number;
};

// カーソルの行（上端から下端）には、重ねない。入る側がなければ、広いほうに置いて、画面の内に収める。
export function placePopup({
	caret,
	popup,
	viewport,
	prefer,
	gap = 4,
	margin = 8,
	minShrunkHeight = 96,
}: PlacePopupInput): PopupPlacement {
	const belowTop = caret.top + caret.height + gap;
	const aboveTop = caret.top - gap - popup.height;
	const fitsBelow = belowTop + popup.height <= viewport.height - margin;
	const fitsAbove = aboveTop >= margin;

	const roomAbove = caret.top - gap - margin;

	// 上を先にしたいのは、IME の変換候補の窓（文字の下に出る）を避けるため。入らなくても、下に置くと窓に重なるので、縮めて上に置く。
	if (prefer === "above" && !fitsAbove && roomAbove >= minShrunkHeight) {
		const maxLeft = Math.max(margin, viewport.width - popup.width - margin);

		return {
			side: "above",
			top: margin,
			left: Math.min(Math.max(caret.left, margin), maxLeft),
			maxHeight: roomAbove,
		};
	}

	let side: "above" | "below";

	if (fitsBelow && fitsAbove) {
		side = prefer;
	} else if (fitsBelow) {
		side = "below";
	} else if (fitsAbove) {
		side = "above";
	} else {
		// どちらにも入らないときは、広い側に置く。
		const spaceBelow = viewport.height - margin - (caret.top + caret.height);
		const spaceAbove = caret.top - margin;

		side = spaceBelow >= spaceAbove ? "below" : "above";
	}

	const top = side === "below" ? belowTop : aboveTop;
	const maxLeft = Math.max(margin, viewport.width - popup.width - margin);

	return {
		side,
		top,
		left: Math.min(Math.max(caret.left, margin), maxLeft),
	};
}
