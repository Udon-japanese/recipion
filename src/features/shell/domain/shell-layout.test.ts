import { describe, expect, it } from "vitest";
import { getShellLayout } from "./shell-layout";

describe("getShellLayout", () => {
	it.each([
		["/shopping", true],
		["/inventory", true],
		["/recipes", true],
		["/recipes/new", true],
		["/recipes/abc/edit", true],
		["/", false],
		["/profile", false],
		["/terms", false],
		["/admin/reports", false],
	])("%s：下部ナビ = %s", (pathname, bottomNav) => {
		expect(getShellLayout(pathname)).toEqual({ frame: true, bottomNav });
	});

	it.each(["/login", "/account-deleted", "/dev/ui"])(
		"%s：枠なし",
		(pathname) => {
			expect(getShellLayout(pathname)).toEqual({
				frame: false,
				bottomNav: false,
			});
		},
	);

	it("名前が似ているだけのパスは、別のものとして扱う", () => {
		expect(getShellLayout("/recipes-old")).toEqual({
			frame: true,
			bottomNav: false,
		});
	});
});
