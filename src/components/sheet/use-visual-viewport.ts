import { useEffect, useState } from "react";

type ViewportBox = {
	// 見えている高さ（キーボードが出ると、小さくなる）。
	height: number;
	// 画面の下端から、見えている領域の下端までの距離（キーボードの高さ）。
	bottomOffset: number;
};

function read(): ViewportBox {
	const viewport = window.visualViewport;

	if (!viewport) {
		return { height: window.innerHeight, bottomOffset: 0 };
	}

	return {
		height: viewport.height,
		bottomOffset: Math.max(
			0,
			window.innerHeight - (viewport.height + viewport.offsetTop),
		),
	};
}

// 見えている領域（キーボードを除く）の大きさ。キーボードが出ても、シートが隠れないように使う。
export function useVisualViewport(active: boolean): ViewportBox {
	const [box, setBox] = useState<ViewportBox>(() =>
		typeof window === "undefined" ? { height: 800, bottomOffset: 0 } : read(),
	);

	useEffect(() => {
		if (!active) {
			return;
		}

		const update = () => setBox(read());
		const viewport = window.visualViewport;

		update();
		viewport?.addEventListener("resize", update);
		viewport?.addEventListener("scroll", update);
		window.addEventListener("resize", update);

		return () => {
			viewport?.removeEventListener("resize", update);
			viewport?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [active]);

	return box;
}
