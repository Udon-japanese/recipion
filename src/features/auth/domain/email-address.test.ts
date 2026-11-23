import { describe, expect, it } from "vitest";
import cases from "../../../../shared-data/test-cases/email-address.json";
import { parseEmailAddress } from "./email-address";

describe("parseEmailAddress", () => {
	it.each(cases)("$input → $expected", ({ input, expected }) => {
		expect(parseEmailAddress(input)).toBe(expected);
	});
});
