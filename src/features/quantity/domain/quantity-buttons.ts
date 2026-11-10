import { formatQuantity } from "./format-quantity";
import { parseQuantityInput } from "./parse-quantity-input";

// 数量の入力欄の横に置く、ボタン。単位ごとに、よく使う量が違うので、単位に合わせて出し分ける。
// - set: 入力欄をその値にする（1/3 など、端数の量）。
// - add: 入力欄の値に足す（g・ml の +50 など）。
export type QuantityButton =
	| { kind: "set"; value: string }
	| { kind: "add"; amount: number };

const fractionSets = {
	// 1玉・1株を切って使うことが多い。
	wholeVegetable: ["1/4", "1/3", "1/2", "3/4"],
	// 大根・にんじん・長ねぎなどの1本。
	stick: ["1/3", "1/2", "2/3"],
	// 玉ねぎ1/2個、トマト1/2個など。
	piece: ["1/2"],
	measure: ["1/4", "1/2", "3/4"],
} as const;

const buttonsByUnit: Record<string, readonly QuantityButton[]> = {
	玉: fractionSets.wholeVegetable.map((value) => ({ kind: "set", value })),
	株: fractionSets.wholeVegetable.map((value) => ({ kind: "set", value })),
	本: fractionSets.stick.map((value) => ({ kind: "set", value })),
	個: fractionSets.piece.map((value) => ({ kind: "set", value })),
	丁: fractionSets.piece.map((value) => ({ kind: "set", value })),
	// 作り置きのできあがり（レシピ1回分）。半分や1/3を使うことが多い。
	回分: fractionSets.wholeVegetable.map((value) => ({ kind: "set", value })),
	カップ: fractionSets.measure.map((value) => ({ kind: "set", value })),
	g: [10, 50, 100, 200, 500].map((amount) => ({ kind: "add", amount })),
	ml: [50, 100, 200, 500].map((amount) => ({ kind: "add", amount })),
};

/** 端数のボタン（1/2 など）を持つ単位か。在庫の画面では、これらの単位に「今ある量の割合」のボタンを出す。 */
export function hasFractionButtons(
	unitLabel: string | null | undefined,
): boolean {
	return getQuantityButtons(unitLabel).some((button) => button.kind === "set");
}

const shareRatios = [
	{ label: "半分", ratio: 1 / 2 },
	{ label: "1/3", ratio: 1 / 3 },
	{ label: "1/4", ratio: 1 / 4 },
] as const;

export type ShareQuantityPreset = {
	label: string;
	value: string;
	ariaLabel: string;
};

/**
 * いまある量の「半分・1/3・1/4」の量のボタン。
 * - 端数のボタンを持つ単位（玉・個・本など）だけ。在庫が 0 以下のときは、なし。
 * - 割り切れず、きれいな分数（2・3・4・8分の1）にならない量（3.5個の 1/3 など）は、そのボタンだけ出さない。
 */
export function getShareQuantityPresets(
	available: number,
	unitLabel: string | null | undefined,
): ShareQuantityPreset[] {
	if (!(available > 0) || !hasFractionButtons(unitLabel)) {
		return [];
	}

	return shareRatios.flatMap(({ label, ratio }) => {
		const value = formatQuantity(available * ratio, {
			grouping: false,
			allowFractions: true,
		});

		// 分数にできなかった量は、小数（1.166667 など）で返ってくる。
		return parseQuantityInput(value) !== null && !value.includes(".")
			? [{ label, value, ariaLabel: `今ある分の${label}（${value}）にする` }]
			: [];
	});
}

/**
 * 単位に合わせた、数量のボタン。枚・袋・パック・缶など、端数にしない単位や、知らない単位は、ボタンなし。
 * 単位が空のときも、ボタンなし。
 */
export function getQuantityButtons(
	unitLabel: string | null | undefined,
): readonly QuantityButton[] {
	const unit = unitLabel?.trim().toLocaleLowerCase("ja-JP");

	return (unit ? buttonsByUnit[unit] : undefined) ?? [];
}

/**
 * 量の欄の、はじめの値。足すボタン（+50 など）がある単位（g・ml）は、空（1 に足すと 51 になってしまう）。
 * ほかの単位は 1（「1個使った」を、ボタン1回で済ませる）。
 */
export function initialQuantityInput(
	unitLabel: string | null | undefined,
): string {
	return getQuantityButtons(unitLabel).some((button) => button.kind === "add")
		? ""
		: "1";
}

/** いまの量を、量の欄に入れる文字にする（「今ある分」）。 */
export function formatQuantityInput(quantity: number): string {
	return formatQuantity(quantity, { grouping: false, allowFractions: false });
}

export function describeQuantityButton(button: QuantityButton): string {
	return button.kind === "set" ? button.value : `+${button.amount}`;
}

export function describeQuantityButtonForAssistiveTech(
	button: QuantityButton,
): string {
	return button.kind === "set"
		? `${button.value}にする`
		: `${button.amount}を足す`;
}

/** ボタンを押したあとの、入力欄の文字。足すときは、いまの値（読めなければ 0）に足す。 */
export function applyQuantityButton(
	current: string,
	button: QuantityButton,
): string {
	if (button.kind === "set") {
		return button.value;
	}

	const base = parseQuantityInput(current) ?? 0;

	return formatQuantity(base + button.amount, {
		grouping: false,
		allowFractions: false,
	});
}
