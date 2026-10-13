import { describe, expect, it } from "vitest";
import {
	createMascotPhysics,
	getMascotPose,
	getRestingMascotPose,
	stepMascotPhysics,
} from "./mascot-physics";

// 種が同じなら同じ列を返す乱数（mulberry32）。
function seeded(seed: number) {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function run(seconds: number, random: () => number) {
	const physics = createMascotPhysics(random);
	const poses = [];
	for (let t = 0; t < seconds * 1000; t += 16) {
		stepMascotPhysics(physics, 16, random);
		poses.push(getMascotPose(physics));
	}
	return { physics, poses };
}

describe("マスコットの物理", () => {
	it("同じ乱数なら、同じ動きになる", () => {
		const a = run(3, seeded(782));
		const b = run(3, seeded(782));
		expect(a.poses.at(-1)).toEqual(b.poses.at(-1));
	});

	it("跳ねても、動ける範囲（舞台）から出ない", () => {
		const { poses } = run(30, seeded(904));
		for (const pose of poses) {
			// 足元は舞台の中心から、横に±10、縦に最大で上へ約15まで。
			expect(Math.abs(pose.x)).toBeLessThanOrEqual(10.5);
			expect(pose.y).toBeGreaterThan(-20);
			expect(pose.y).toBeLessThan(10);
		}
	});

	it("実際に跳ねる（位置が変わる）", () => {
		const { poses } = run(5, seeded(782));
		const xs = new Set(poses.map((pose) => pose.x.toFixed(1)));
		expect(xs.size).toBeGreaterThan(5);
	});

	it("体は、潰れすぎ・伸びすぎない", () => {
		const { poses } = run(20, seeded(92));
		for (const pose of poses) {
			expect(pose.scaleY).toBeGreaterThanOrEqual(0.6);
			expect(pose.scaleY).toBeLessThanOrEqual(1.4);
			expect(pose.eyeScaleY).toBeGreaterThan(0);
		}
	});

	it("止まっているときの姿勢は、動かない", () => {
		expect(getRestingMascotPose()).toEqual(getRestingMascotPose());
	});
});
