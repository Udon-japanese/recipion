// マスコットの動き（バネ物理）。画面には依存しない純粋な計算。
// 単位は「基準の大きさ（幅19・高さ18）」のピクセル。表示の大きさへの拡大は呼び出し側で行う。
// 乱数は引数で渡せる（テストで決定的にするため）。

export const MASCOT_BASE_WIDTH = 19;
export const MASCOT_BASE_HEIGHT = 18;
// 動ける範囲の「舞台」の基準の大きさ。
export const MASCOT_STAGE_SIZE = 52;

// 足元（接地点）が動ける楕円。舞台の中心からの距離。
const AREA_RX = 10;
const AREA_CY = 7;
const AREA_RY = 6;

export type Random = () => number;

type Spring = { x: number; v: number };
type Point = { x: number; y: number };
type Target = Point & { dist: number };
type Phase = "idle" | "anticipate" | "air";

export type MascotPhysics = {
	// true：自分で次々に跳ねる。false：startMascotHop で、1回だけ跳ねる。
	loop: boolean;
	// 動き回る範囲の倍率（1 が基準。小さいほど、中心の近くだけを動く）。
	roam: number;
	x: number;
	y: number;
	lift: number;
	phase: Phase;
	t: number;
	wait: number;
	antic: number;
	from: Point;
	to: Target | null;
	dur: number;
	arc: number;
	d: Spring;
	sk: Spring;
	lean: Spring;
	clock: number;
	blinkIn: number;
	blinkT: number;
	blinkScale: number;
};

export type MascotPose = {
	x: number;
	y: number;
	rotate: number;
	skewX: number;
	scaleX: number;
	scaleY: number;
	borderRadius: string;
	eyeOffset: number;
	eyeScaleY: number;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const range = (random: Random, a: number, b: number) => a + random() * (b - a);

function inArea(x: number, y: number, roam: number) {
	return (
		(x / (AREA_RX * roam)) ** 2 +
			((y - AREA_CY * roam) / (AREA_RY * roam)) ** 2 <=
		1
	);
}

function stepSpring(
	s: Spring,
	target: number,
	k: number,
	c: number,
	dt: number,
) {
	s.v += (k * (target - s.x) - c * s.v) * dt;
	s.x += s.v * dt;
}

function pickTarget(from: Point, random: Random, roam: number): Target {
	for (let i = 0; i < 24; i++) {
		const dist = range(random, 9 * roam, 15 * roam);
		const angle = range(random, 0, Math.PI * 2);
		const x = from.x + Math.cos(angle) * dist;
		const y = from.y + Math.sin(angle) * dist * 0.7;

		if (inArea(x, y, roam)) {
			return { x, y, dist: Math.hypot(x - from.x, y - from.y) || 1 };
		}
	}

	const centerY = AREA_CY * roam;

	return { x: 0, y: centerY, dist: Math.hypot(from.x, centerY - from.y) || 1 };
}

export function createMascotPhysics(
	random: Random,
	loop = true,
	roam = 1,
): MascotPhysics {
	return {
		loop,
		roam,
		x: 0,
		y: AREA_CY * roam,
		lift: 0,
		phase: "idle",
		t: 0,
		wait: 150,
		antic: 130,
		from: { x: 0, y: AREA_CY * roam },
		to: null,
		dur: 0,
		arc: 0,
		d: { x: 0, v: 0 },
		sk: { x: 0, v: 0 },
		lean: { x: 0, v: 0 },
		clock: 0,
		blinkIn: range(random, 1500, 3000),
		blinkT: -1,
		blinkScale: 1,
	};
}

// 経過時間 dtMs（ミリ秒）だけ進める。状態を直接書き換える。
export function stepMascotPhysics(
	s: MascotPhysics,
	elapsedMs: number,
	random: Random,
) {
	const dt = Math.min(elapsedMs, 32);

	s.clock += dt;
	s.t += dt;

	let dTarget = 0;
	let leanTarget = 0;

	if (s.phase === "idle") {
		// 周期の違う2つの波で、機械的でない呼吸にする。
		dTarget =
			0.03 * Math.sin(s.clock * 0.0069) +
			0.018 * Math.sin(s.clock * 0.0119 + 1);

		// ぽよんが収まるまで、次のジャンプに入らない。
		const settled =
			Math.abs(s.d.x - dTarget) < 0.04 &&
			Math.abs(s.d.v) < 0.8 &&
			Math.abs(s.sk.x) < 1.5 &&
			Math.abs(s.sk.v) < 10;

		if (s.loop && s.t >= s.wait && (settled || s.t > 700)) {
			s.phase = "anticipate";
			s.t = 0;
			s.antic = 140;
			s.to = pickTarget({ x: s.x, y: s.y }, random, s.roam);
		}
	} else if (s.phase === "anticipate") {
		dTarget = -0.3;

		if (s.t >= s.antic && s.to) {
			s.phase = "air";
			s.t = 0;
			s.from = { x: s.x, y: s.y };
			// 滞空時間はほぼ一定にして、一定のテンポを作る。
			s.dur = 440 * range(random, 0.95, 1.05);
			s.arc = 3.5 + Math.min(s.to.dist, 18) * 0.14;
			s.d.v += 6; // 蹴り出しで縦に伸びる
		}
	} else if (s.to) {
		const p = clamp(s.t / s.dur, 0, 1);
		// 蹴り出しは速く、着地の直前は速度がゼロに近づく。
		const e = Math.sin((p * Math.PI) / 2);
		const dx = s.to.x - s.from.x;
		const dy = s.to.y - s.from.y;

		s.x = s.from.x + dx * e;
		s.y = s.from.y + dy * e;
		s.lift = s.arc * 4 * p * (1 - p);

		dTarget = 0.2 - 0.16 * p;
		leanTarget = (dx / s.to.dist) * 14 * Math.sin(Math.PI * p);

		if (p >= 1) {
			s.x = s.to.x;
			s.y = s.to.y;
			s.lift = 0;

			// 着地の衝撃：潰れる向きに勢いをつけ、ぽよんと揺れ戻す。
			s.d.x = Math.min(s.d.x, 0);
			s.d.v = -5.5;
			s.sk.v += (dx / s.to.dist) * 55;

			s.phase = "idle";
			s.t = 0;
			s.wait = 220;
		}
	}

	// 2つに分けて進めて、安定させる。
	const sec = dt / 1000 / 2;
	for (let i = 0; i < 2; i++) {
		stepSpring(s.d, dTarget, 260, 13, sec);
		stepSpring(s.sk, 0, 140, 5.5, sec);
		stepSpring(s.lean, leanTarget, 160, 12, sec);
	}

	// まばたき
	s.blinkIn -= dt;
	if (s.blinkT < 0 && s.blinkIn <= 0) {
		s.blinkT = 0;
	}
	if (s.blinkT >= 0) {
		s.blinkT += dt;
		const bp = clamp(s.blinkT / 140, 0, 1);
		s.blinkScale = 1 - 0.9 * Math.sin(Math.PI * bp);

		if (bp >= 1) {
			s.blinkT = -1;
			s.blinkScale = 1;
			s.blinkIn = range(random, 1800, 4200);
		}
	}
}

// その場で、1回だけ跳ねる。跳ねている最中は、受け付けない（false を返す）。
export function startMascotHop(s: MascotPhysics): boolean {
	if (s.phase !== "idle") {
		return false;
	}

	s.phase = "anticipate";
	s.t = 0;
	s.antic = 140;
	s.to = { x: s.x, y: s.y, dist: 1 };

	return true;
}

// 跳ねたあとの揺れが収まって、止まっているか（動きの計算を止めてよいか）。
export function isMascotAtRest(s: MascotPhysics): boolean {
	return (
		s.phase === "idle" &&
		Math.abs(s.d.x) < 0.04 &&
		Math.abs(s.d.v) < 0.8 &&
		Math.abs(s.sk.x) < 1.5 &&
		Math.abs(s.sk.v) < 10 &&
		Math.abs(s.lean.x) < 0.5
	);
}

export function getMascotPose(s: MascotPhysics): MascotPose {
	const d = s.d.x;
	const scaleY = clamp(1 + d, 0.6, 1.4);
	// 体積をだいたい保つ。
	const scaleX = scaleY ** -0.8;
	const rotate = clamp(s.lean.x, -20, 20);
	const skewX = clamp(s.sk.x, -14, 14);

	// 潰れると底が広がり、揺れると肩が左右にずれる。
	const squash = clamp(-d, 0, 0.45);
	const topLeft = 50 + skewX * 0.5;
	const topRight = 50 - skewX * 0.5;
	const bottom = 38 + squash * 18;

	return {
		x: s.x,
		y: s.y - s.lift - MASCOT_BASE_HEIGHT / 2,
		rotate,
		skewX,
		scaleX,
		scaleY,
		borderRadius: `${topLeft.toFixed(1)}% ${topRight.toFixed(1)}% ${bottom.toFixed(1)}% ${bottom.toFixed(1)}% / 58% 58% 42% 42%`,
		// 目は進行方向へ少し寄り、伸び縮みとまばたきに追従する。
		eyeOffset: clamp(rotate * 0.12 + skewX * 0.05, -1.4, 1.4),
		eyeScaleY: clamp(1 + d * 0.7, 0.6, 1.3) * s.blinkScale,
	};
}

// 動かさないとき（動きを減らす設定、停止中）の姿勢。
export function getRestingMascotPose(): MascotPose {
	return getMascotPose(createMascotPhysics(() => 0.5));
}
