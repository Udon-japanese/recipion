import { describe, expect, it } from "vitest";
import { measureFloorRoom } from "./use-floor-room";

describe("measureFloorRoom", () => {
	it.each([
		// 縦に長いスマホ：絵を少し小さくして、上に 64・下に 88 を空ける。
		{ width: 361, height: 706, expected: 88 },
		// 絵を幅の1.3倍より小さくはしない：上の壁を先にとり、残りが床。
		{ width: 358, height: 560, expected: 560 - 64 - 358 * 1.3 },
		// 絵より低い場面（ブラウザのバーで縮んだスマホ・PC）：床はない。
		{ width: 358, height: 470, expected: 0 },
		{ width: 900, height: 720, expected: 0 },
	])("幅 $width・高さ $height → $expected", ({ width, height, expected }) => {
		expect(measureFloorRoom(width, height)).toBeCloseTo(expected);
	});
});
