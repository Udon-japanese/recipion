import { type ClientPlatform, clientPlatforms } from "#/config/client-versions";

// クライアントが毎回送る、種類と版のヘッダー（例：`android/1.2.0`）。
export const CLIENT_HEADER = "x-recipion-client";

export type ClientVersion = {
	platform: ClientPlatform;
	version: readonly [number, number, number];
};

const clientHeaderPattern = /^([a-z]+)\/(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/u;

function isClientPlatform(value: string): value is ClientPlatform {
	return (clientPlatforms as readonly string[]).includes(value);
}

// ヘッダーの値を読む。形が違えば null。
export function parseClientHeader(value: string): ClientVersion | null {
	const match = clientHeaderPattern.exec(value.trim());

	if (!match) {
		return null;
	}

	const [, platform = "", major = "", minor = "", patch = ""] = match;

	if (!isClientPlatform(platform)) {
		return null;
	}

	return {
		platform,
		version: [Number(major), Number(minor), Number(patch)],
	};
}

// 「メジャー.マイナー.パッチ」の文字列を読む（設定の値用）。形が違えば null。
export function parseVersion(
	value: string,
): readonly [number, number, number] | null {
	const parsed = parseClientHeader(`web/${value}`);

	return parsed?.version ?? null;
}

// a が b より古ければ負、同じなら 0、新しければ正。
export function compareVersions(
	a: readonly [number, number, number],
	b: readonly [number, number, number],
): number {
	for (let index = 0; index < 3; index += 1) {
		const difference = (a[index] ?? 0) - (b[index] ?? 0);

		if (difference !== 0) {
			return difference;
		}
	}

	return 0;
}

export type ClientVersionCheck =
	// ヘッダーがない。
	| "missing"
	// ヘッダーの形が違う、知らない種類。
	| "invalid"
	// 受け付ける最も古い版より古い。
	| "too-old"
	| "ok";

export function checkClientVersion(
	headerValue: string | null | undefined,
	minimums: Record<ClientPlatform, string>,
): ClientVersionCheck {
	if (headerValue == null || headerValue.trim() === "") {
		return "missing";
	}

	const client = parseClientHeader(headerValue);

	if (!client) {
		return "invalid";
	}

	const minimum = parseVersion(minimums[client.platform]);

	if (!minimum) {
		throw new Error(`最も古い版の設定が正しくありません: ${client.platform}`);
	}

	return compareVersions(client.version, minimum) < 0 ? "too-old" : "ok";
}
