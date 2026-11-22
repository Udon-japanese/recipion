import { describe, expect, it } from "vitest";
import { isSameOriginRequest, needsSameOriginCheck } from "./same-origin";

const url = "https://recipion.app/api/v1/items";

describe("isSameOriginRequest", () => {
	it.each([
		[{ "sec-fetch-site": "same-origin" }, true],
		[{ "sec-fetch-site": "cross-site", origin: "https://recipion.app" }, false],
		[{ "sec-fetch-site": "same-site" }, false],
		[{ origin: "https://recipion.app" }, true],
		[{ origin: "https://evil.example" }, false],
		[{ referer: "https://recipion.app/shopping" }, true],
		[{ referer: "https://recipion.app.evil.example/" }, false],
		[{ referer: "not a url" }, false],
		[{}, false],
	])("%j は %s", (headers, expected) => {
		expect(isSameOriginRequest(new Headers(headers), url)).toBe(expected);
	});
});

describe("needsSameOriginCheck", () => {
	const withCookie = new Headers({ cookie: "better-auth.session_token=a.b" });
	const withBearer = new Headers({ authorization: "Bearer a.b" });

	it.each([
		["POST", withCookie, true],
		["delete", withCookie, true],
		["GET", withCookie, false],
		["OPTIONS", withCookie, false],
		["POST", withBearer, false],
	])("%s は %s", (method, headers, expected) => {
		expect(needsSameOriginCheck(method, headers)).toBe(expected);
	});
});
