import * as v from "valibot";

// decodeIntegrityToken の応答のうち、見る項目だけ（ほかの項目は無視する）。
// https://developer.android.com/google/play/integrity/verdicts
const tokenPayloadSchema = v.object({
	requestDetails: v.object({
		requestPackageName: v.string(),
		requestHash: v.optional(v.string()),
		// int64 は、文字列で届く。
		timestampMillis: v.pipe(v.string(), v.digits()),
	}),
	appIntegrity: v.object({
		appRecognitionVerdict: v.string(),
	}),
	deviceIntegrity: v.object({
		deviceRecognitionVerdict: v.optional(v.array(v.string()), []),
	}),
});

export const decodeResponseSchema = v.object({
	tokenPayloadExternal: v.unknown(),
});

type ExpectedRequest = {
	packageName: string;
	requestHash: string;
	now: Date;
	maxAgeMs: number;
};

// 判定を信頼してよいか。要求に結び付いていて（パッケージ名・requestHash・作られた時刻）、
// Play から入れた正規のアプリで、端末も正規のもののときだけ true。
// 無料のアプリなので、ライセンス（appLicensingVerdict）は見ない。
export function isTrustedVerdict(
	payload: unknown,
	expected: ExpectedRequest,
): boolean {
	const parsed = v.safeParse(tokenPayloadSchema, payload);

	if (!parsed.success) {
		return false;
	}

	const { requestDetails, appIntegrity, deviceIntegrity } = parsed.output;
	const age = expected.now.getTime() - Number(requestDetails.timestampMillis);

	return (
		requestDetails.requestPackageName === expected.packageName &&
		requestDetails.requestHash === expected.requestHash &&
		// 時計のずれで、少し未来の時刻になることもあるので、前後どちらも許す。
		Math.abs(age) <= expected.maxAgeMs &&
		appIntegrity.appRecognitionVerdict === "PLAY_RECOGNIZED" &&
		deviceIntegrity.deviceRecognitionVerdict.includes("MEETS_DEVICE_INTEGRITY")
	);
}
