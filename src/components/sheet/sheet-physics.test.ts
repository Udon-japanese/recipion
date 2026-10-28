import { describe, expect, it } from "vitest";
import {
	backdropProgress,
	displayVisible,
	estimateVelocity,
	resolveRelease,
	rubberBand,
	snapsToVisible,
} from "./sheet-physics";

const snaps = [520, 780]; // 見える高さ（px）の昇順

describe("rubberBand", () => {
	it("引いていなければ 0、引くほど増えるが、上限（120）を超えない", () => {
		expect(rubberBand(0)).toBe(0);
		expect(rubberBand(-10)).toBe(0);
		expect(rubberBand(50)).toBeGreaterThan(0);
		expect(rubberBand(50)).toBeLessThan(rubberBand(200));
		expect(rubberBand(100000)).toBeLessThan(120);
		// 重く感じるよう、100px 引いても、25px ほどしか、動かない。
		expect(rubberBand(100)).toBeLessThan(25);
	});

	it("引いた量より、いつも小さい（重く感じる）", () => {
		for (const offset of [10, 50, 100, 300]) {
			expect(rubberBand(offset)).toBeLessThan(offset);
		}
	});
});

describe("displayVisible", () => {
	it("止まり位置の間では、指のとおりに動く", () => {
		expect(displayVisible(600, snaps, true)).toBe(600);
	});

	it("最も高い位置を超えると、ゴムのように重くなる", () => {
		const shown = displayVisible(900, snaps, true);

		expect(shown).toBeGreaterThan(780);
		expect(shown).toBeLessThan(900);
	});

	it("閉じられるシートは、下まで下げられる。閉じられないシートは、最も低い位置の下で重くなる", () => {
		expect(displayVisible(100, snaps, true)).toBe(100);
		expect(displayVisible(100, snaps, false)).toBeGreaterThan(100);
		expect(displayVisible(100, snaps, false)).toBeLessThan(520);
		expect(displayVisible(-50, snaps, true)).toBe(0);
	});
});

describe("estimateVelocity", () => {
	it("直近の動きから、速さを出す（下向きが正）", () => {
		const samples = [
			{ y: 100, t: 0 },
			{ y: 130, t: 50 },
			{ y: 160, t: 100 },
		];

		expect(estimateVelocity(samples, 100)).toBeCloseTo(0.6, 5);
	});

	it("古い動きは使わず、動きがなければ 0", () => {
		expect(estimateVelocity([{ y: 0, t: 0 }], 500)).toBe(0);
		expect(
			estimateVelocity(
				[
					{ y: 0, t: 0 },
					{ y: 500, t: 10 },
				],
				1000,
			),
		).toBe(0);
		expect(estimateVelocity([], 0)).toBe(0);
	});
});

describe("resolveRelease", () => {
	it("下へはじくと、1つ低い止まり位置へ。いちばん低い位置からなら、閉じる", () => {
		expect(
			resolveRelease({ visible: 780, velocity: 0.6, snaps, dismissible: true }),
		).toEqual({ type: "snap", index: 0 });
		expect(
			resolveRelease({ visible: 520, velocity: 0.6, snaps, dismissible: true }),
		).toEqual({ type: "dismiss" });
	});

	it("勢いよく下へはじくと、どの位置からでも閉じる（閉じられないシートは、最も低い位置へ）", () => {
		expect(
			resolveRelease({ visible: 780, velocity: 1.2, snaps, dismissible: true }),
		).toEqual({ type: "dismiss" });
		expect(
			resolveRelease({
				visible: 780,
				velocity: 1.2,
				snaps,
				dismissible: false,
			}),
		).toEqual({ type: "snap", index: 0 });
	});

	it("閉じられないシートは、下へはじいても、最も低い位置に止まる", () => {
		expect(
			resolveRelease({
				visible: 520,
				velocity: 0.9,
				snaps,
				dismissible: false,
			}),
		).toEqual({ type: "snap", index: 0 });
	});

	it("上へはじくと、1つ高い止まり位置（いちばん上なら、そこ）へ", () => {
		expect(
			resolveRelease({
				visible: 520,
				velocity: -0.6,
				snaps,
				dismissible: true,
			}),
		).toEqual({ type: "snap", index: 1 });
		expect(
			resolveRelease({
				visible: 780,
				velocity: -0.6,
				snaps,
				dismissible: true,
			}),
		).toEqual({ type: "snap", index: 1 });
	});

	it("ゆっくりでも、最も低い位置から 25% より多く下げて離すと、閉じる", () => {
		expect(
			resolveRelease({
				visible: 380,
				velocity: 0.05,
				snaps,
				dismissible: true,
			}),
		).toEqual({ type: "dismiss" });
		expect(
			resolveRelease({
				visible: 400,
				velocity: 0.05,
				snaps,
				dismissible: true,
			}),
		).toEqual({ type: "snap", index: 0 });
	});

	it("ゆっくり動かしたときは、いちばん近い止まり位置に止まる", () => {
		expect(
			resolveRelease({ visible: 700, velocity: 0, snaps, dismissible: true }),
		).toEqual({ type: "snap", index: 1 });
		expect(
			resolveRelease({ visible: 600, velocity: 0, snaps, dismissible: true }),
		).toEqual({ type: "snap", index: 0 });
	});

	it("止まり位置が1つだけでも、25% 下げると閉じる", () => {
		expect(
			resolveRelease({
				visible: 300,
				velocity: 0,
				snaps: [520],
				dismissible: true,
			}),
		).toEqual({ type: "dismiss" });
		expect(
			resolveRelease({
				visible: 500,
				velocity: 0,
				snaps: [520],
				dismissible: true,
			}),
		).toEqual({ type: "snap", index: 0 });
	});
});

describe("backdropProgress / snapsToVisible", () => {
	it("暗幕は、最も低い位置で 1、閉じるほど薄い", () => {
		expect(backdropProgress(520, 520)).toBe(1);
		expect(backdropProgress(780, 520)).toBe(1);
		expect(backdropProgress(260, 520)).toBe(0.5);
		expect(backdropProgress(0, 520)).toBe(0);
		expect(backdropProgress(10, 0)).toBe(0);
	});

	it("画面の高さの割合を、昇順の px にする", () => {
		expect(snapsToVisible([0.92, 0.62], 844)).toEqual([523, 776]);
	});
});
