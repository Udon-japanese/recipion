// textarea には、カーソルの座標を取る方法がない。同じ見た目の隠し要素（鏡）に、カーソルまでの文字を入れて、末尾の位置を測る。

export type MeasuredCaret = { top: number; left: number; height: number };

// 鏡に、textarea と同じ見た目（文字、余白、折り返し）をそろえるための CSS のプロパティ。
const mirroredProperties = [
	"direction",
	"box-sizing",
	"border-top-width",
	"border-right-width",
	"border-bottom-width",
	"border-left-width",
	"border-style",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"font-style",
	"font-variant",
	"font-weight",
	"font-stretch",
	"font-size",
	"font-size-adjust",
	"font-family",
	"line-height",
	"text-align",
	"text-transform",
	"text-indent",
	"letter-spacing",
	"word-spacing",
	"word-break",
	"overflow-wrap",
	"line-break",
	"tab-size",
] as const;

// カーソル（本文の index の位置）の、textarea の左上（枠の外側）を基準にした座標と、行の高さ。スクロールした分は、引く。
export function measureTextareaCaret(
	textarea: HTMLTextAreaElement,
	index: number,
): MeasuredCaret {
	const computed = window.getComputedStyle(textarea);
	const mirror = document.createElement("div");

	for (const property of mirroredProperties) {
		mirror.style.setProperty(property, computed.getPropertyValue(property));
	}

	const borderLeft = Number.parseFloat(computed.borderLeftWidth) || 0;
	const borderRight = Number.parseFloat(computed.borderRightWidth) || 0;

	mirror.style.position = "absolute";
	mirror.style.visibility = "hidden";
	mirror.style.top = "0";
	mirror.style.left = "-9999px";
	mirror.style.overflow = "hidden";
	mirror.style.whiteSpace = "pre-wrap";
	// スクロールバーを除いた幅（本物の textarea の文字が並ぶ幅と同じ）。
	mirror.style.width = `${textarea.clientWidth + borderLeft + borderRight}px`;

	mirror.textContent = textarea.value.slice(0, index);

	const marker = document.createElement("span");

	// 後ろの文字も入れて、カーソルの位置で折り返すかどうかを、本物と同じにする。
	marker.textContent = textarea.value.slice(index) || ".";
	mirror.appendChild(marker);
	document.body.appendChild(mirror);

	const lineHeight = Number.parseFloat(computed.lineHeight);
	const mirrorRect = mirror.getBoundingClientRect();
	// 後ろの文章が複数行に続くと、目印（span）の矩形は、全部の行を含む大きな箱になる。カーソルの行（最初の行）の矩形だけを使う。
	const markerRect =
		marker.getClientRects()[0] ?? marker.getBoundingClientRect();
	const height = Number.isNaN(lineHeight) ? markerRect.height : lineHeight;
	// 文字の箱の上端は、行の上端より、行間の半分だけ下にある。行の上端に合わせる。
	const halfLeading = (height - markerRect.height) / 2;
	// 矩形の差には、鏡の枠と余白がすでに含まれている（textarea の枠の外側が基準になる）。
	const measured = {
		top: markerRect.top - mirrorRect.top - halfLeading - textarea.scrollTop,
		left: markerRect.left - mirrorRect.left - textarea.scrollLeft,
		height,
	};

	document.body.removeChild(mirror);

	return measured;
}
