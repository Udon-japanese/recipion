import { describe, expect, it } from "vitest";
import {
	applyBackspace,
	applyDelete,
	applyInput,
	createEmptyDigits,
	extractDigits,
	isComplete,
	joinDigits,
	stripExistingDigit,
} from "./otp-input-logic";

describe("extractDigits", () => {
	it("全角の数字を半角にして、数字以外を取り除く", () => {
		expect(extractDigits("１２3 - ４")).toBe("1234");
		expect(extractDigits("abc")).toBe("");
	});
});

describe("applyInput", () => {
	it("1 文字を入れると、次の欄にフォーカスが移る", () => {
		const result = applyInput(createEmptyDigits(6), 0, "1");

		expect(result.digits).toEqual(["1", "", "", "", "", ""]);
		expect(result.focusIndex).toBe(1);
	});

	it("最後の欄に入れたときは、最後の欄にとどまる", () => {
		const result = applyInput(["1", "2", "3", "4", "5", ""], 5, "6");

		expect(joinDigits(result.digits)).toBe("123456");
		expect(result.focusIndex).toBe(5);
	});

	it("貼り付けや自動入力（全桁分）は、どの欄に入っても、先頭から入れる", () => {
		const result = applyInput(createEmptyDigits(6), 3, "654321");

		expect(joinDigits(result.digits)).toBe("654321");
		expect(result.focusIndex).toBe(5);
	});

	it("短い貼り付けは、その欄から順に入れ、入れ終わった次の欄にフォーカスする", () => {
		const result = applyInput(createEmptyDigits(6), 2, "12");

		expect(result.digits).toEqual(["", "", "1", "2", "", ""]);
		expect(result.focusIndex).toBe(4);
	});

	it("貼り付けた文字に、数字以外や空白が混じっていても、数字だけを入れる", () => {
		const result = applyInput(createEmptyDigits(6), 0, "12 34-56");

		expect(joinDigits(result.digits)).toBe("123456");
	});

	it("数字がなければ、何も変えない", () => {
		const digits = ["1", "", "", "", "", ""];
		const result = applyInput(digits, 1, "x");

		expect(result.digits).toEqual(digits);
		expect(result.focusIndex).toBe(1);
	});
});

describe("stripExistingDigit", () => {
	it("すでに数字がある欄に続けて打ったら、新しい数字だけを取り出す", () => {
		expect(stripExistingDigit("1", "12")).toBe("2");
		expect(stripExistingDigit("", "2")).toBe("2");
		// 選択して置き換えた場合（元の数字を含まない）は、そのまま
		expect(stripExistingDigit("1", "2")).toBe("2");
	});
});

describe("applyBackspace", () => {
	it("数字がある欄は、その数字を消して、その欄にとどまる", () => {
		const result = applyBackspace(["1", "2", "", "", "", ""], 1);

		expect(result.digits).toEqual(["1", "", "", "", "", ""]);
		expect(result.focusIndex).toBe(1);
	});

	it("空の欄は、前の欄に戻って、その数字を消す", () => {
		const result = applyBackspace(["1", "2", "", "", "", ""], 2);

		expect(result.digits).toEqual(["1", "", "", "", "", ""]);
		expect(result.focusIndex).toBe(1);
	});

	it("先頭の空の欄では、何も起きない", () => {
		const result = applyBackspace(createEmptyDigits(6), 0);

		expect(result.digits).toEqual(createEmptyDigits(6));
		expect(result.focusIndex).toBe(0);
	});
});

describe("applyDelete / isComplete", () => {
	it("Delete は、その欄だけを消す", () => {
		expect(applyDelete(["1", "2", "3"], 1).digits).toEqual(["1", "", "3"]);
	});

	it("全部の欄が埋まったときだけ、完成とする", () => {
		expect(isComplete(["1", "2", "3"])).toBe(true);
		expect(isComplete(["1", "", "3"])).toBe(false);
		expect(isComplete([])).toBe(false);
	});
});
