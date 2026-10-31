import { useRef } from "react";
import { expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../../styles.css";
import { Pet } from "./pet";

// おうちの範囲（枠）を、小さな箱で真似る。cqh は、この箱の高さが基準になる。
function Harness({ left, top }: { left: number; top: number }) {
	const frameRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={frameRef}
			data-testid="frame"
			style={{
				position: "relative",
				containerType: "size",
				width: 300,
				height: 500,
				marginLeft: 40,
				overflow: "hidden",
			}}
		>
			<Pet
				mood="idle"
				message="あしたまでの「きゅうり」が、あるよ（ほか3件）"
				showMessage
				boundsRef={frameRef}
				style={{ left, top }}
			/>
		</div>
	);
}

// ふきだしは、横のずれが動いて（200ms の動き）、落ち着くので、収まるまで、待って確かめる。
function bounds() {
	const frame = page.getByTestId("frame").element().getBoundingClientRect();
	const bubble = document
		.querySelector("[data-visible]")
		?.getBoundingClientRect();

	if (!bubble) {
		throw new Error("ふきだしが見つかりません");
	}

	return { frame, bubble };
}

it("れしぽよが、左の端にいても、ふきだしは、おうちの範囲の中に収まる", async () => {
	render(<Harness left={10} top={300} />);

	await vi.waitFor(
		() => {
			const { frame, bubble } = bounds();

			expect(bubble.left).toBeGreaterThanOrEqual(frame.left);
			expect(bubble.right).toBeLessThanOrEqual(frame.right);
		},
		{ timeout: 2000 },
	);
});

it("右の端にいても、収まる", async () => {
	render(<Harness left={290} top={300} />);

	await vi.waitFor(
		() => {
			const { frame, bubble } = bounds();

			expect(bubble.left).toBeGreaterThanOrEqual(frame.left);
			expect(bubble.right).toBeLessThanOrEqual(frame.right);
		},
		{ timeout: 2000 },
	);
});

it("上に余裕がないときは、れしぽよの下に出て、範囲の中に収まる", async () => {
	render(<Harness left={150} top={40} />);

	await vi.waitFor(
		() => {
			const { frame, bubble } = bounds();

			expect(bubble.top).toBeGreaterThanOrEqual(frame.top);
			expect(bubble.bottom).toBeLessThanOrEqual(frame.bottom);
		},
		{ timeout: 2000 },
	);
});
