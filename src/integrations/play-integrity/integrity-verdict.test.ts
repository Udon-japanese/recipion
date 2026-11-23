import { describe, expect, it } from "vitest";
import { isTrustedVerdict } from "./integrity-verdict";

const now = new Date("2026-11-23T12:00:00Z");

const expected = {
	packageName: "app.recipion.android",
	requestHash: "hash-of-request",
	now,
	maxAgeMs: 120_000,
};

function payload({
	packageName = "app.recipion.android",
	requestHash = "hash-of-request",
	ageMs = 1_000,
	appRecognitionVerdict = "PLAY_RECOGNIZED",
	deviceRecognitionVerdict = ["MEETS_DEVICE_INTEGRITY"],
}: {
	packageName?: string;
	requestHash?: string;
	ageMs?: number;
	appRecognitionVerdict?: string;
	deviceRecognitionVerdict?: string[];
} = {}) {
	return {
		requestDetails: {
			requestPackageName: packageName,
			requestHash,
			timestampMillis: String(now.getTime() - ageMs),
		},
		appIntegrity: { appRecognitionVerdict },
		deviceIntegrity: { deviceRecognitionVerdict },
	};
}

describe("isTrustedVerdict", () => {
	it.each([
		{
			name: "要求に結び付いた、正規のアプリと端末",
			input: payload(),
			trusted: true,
		},
		{
			name: "強い判定も持つ端末",
			input: payload({
				deviceRecognitionVerdict: [
					"MEETS_BASIC_INTEGRITY",
					"MEETS_DEVICE_INTEGRITY",
					"MEETS_STRONG_INTEGRITY",
				],
			}),
			trusted: true,
		},
		{
			name: "時計のずれで、少し未来の時刻",
			input: payload({ ageMs: -5_000 }),
			trusted: true,
		},
		{
			name: "別のパッケージ",
			input: payload({ packageName: "com.example.fake" }),
			trusted: false,
		},
		{
			name: "別の要求（requestHash が違う）",
			input: payload({ requestHash: "other" }),
			trusted: false,
		},
		{
			name: "古いトークン",
			input: payload({ ageMs: 120_001 }),
			trusted: false,
		},
		{
			name: "Play から入れていない版",
			input: payload({ appRecognitionVerdict: "UNRECOGNIZED_VERSION" }),
			trusted: false,
		},
		{
			name: "使い回されたトークン（判定が消される）",
			input: payload({
				appRecognitionVerdict: "UNEVALUATED",
				deviceRecognitionVerdict: [],
			}),
			trusted: false,
		},
		{
			name: "基本の判定だけの端末",
			input: payload({ deviceRecognitionVerdict: ["MEETS_BASIC_INTEGRITY"] }),
			trusted: false,
		},
		{
			name: "端末の判定がない",
			input: {
				...payload(),
				deviceIntegrity: {},
			},
			trusted: false,
		},
		{ name: "形が違う", input: { requestDetails: {} }, trusted: false },
	])("$name → $trusted", ({ input, trusted }) => {
		expect(isTrustedVerdict(input, expected)).toBe(trusted);
	});
});
