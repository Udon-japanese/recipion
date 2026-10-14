import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./icon";
import { iconDefinitions } from "./icon-definitions";

describe("Icon", () => {
	it("名前がなければ、飾りとして扱い、読み上げない", () => {
		const { container } = render(<Icon name="plus" />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg).not.toHaveAttribute("role");
	});

	it("名前（label）を渡すと、画像として読み上げる", () => {
		const { getByRole } = render(<Icon name="wifi-off" label="オフライン" />);

		expect(getByRole("img", { name: "オフライン" })).toBeInTheDocument();
	});

	it("大きさは 16・20・24 で、線の太さは、サイズによらず 2", () => {
		const { container } = render(<Icon name="plus" size={16} />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("width", "16");
		expect(svg).toHaveAttribute("stroke-width", "2");
	});

	it("点だけのアイコン（grip・more-horizontal）は、塗りで描く", () => {
		const { container } = render(<Icon name="grip" />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("fill", "currentColor");
		expect(svg).toHaveAttribute("stroke", "none");
	});

	it("ナビの選択中用の、塗りのアイコンがある", () => {
		expect(Object.keys(iconDefinitions)).toEqual(
			expect.arrayContaining([
				"shopping-bag-fill",
				"inventory-box-fill",
				"book-fill",
				"check-circle-fill",
			]),
		);
	});
});
