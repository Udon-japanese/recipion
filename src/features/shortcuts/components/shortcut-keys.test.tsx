import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShortcutKeys } from "./shortcut-keys";

afterEach(cleanup);

describe("ShortcutKeys", () => {
	it("Apple 系は Option、それ以外は Alt と表示する", () => {
		const apple = render(
			<ShortcutKeys keys={["alt", "up-down"]} platform="apple" />,
		);

		expect(apple.container.textContent).toBe("Option+↑↓");
		cleanup();

		const other = render(
			<ShortcutKeys keys={["alt", "up-down"]} platform="other" />,
		);

		expect(other.container.textContent).toBe("Alt+↑↓");
	});

	it("キーごとに <kbd> で表示する", () => {
		const { container } = render(
			<ShortcutKeys keys={["mod", "z"]} platform="other" />,
		);

		expect(
			[...container.querySelectorAll("kbd")].map((kbd) => kbd.textContent),
		).toEqual(["Ctrl", "Z"]);
	});

	it("Apple 系で記号を指定すると、記号で、区切りなしで表示する", () => {
		const { container } = render(
			<ShortcutKeys
				keys={["alt", "up-down"]}
				platform="apple"
				appleStyle="symbol"
			/>,
		);

		expect(container.textContent).toBe("⌥↑↓");
	});
});
