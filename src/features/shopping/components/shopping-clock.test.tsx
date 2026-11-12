import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShoppingClock } from "./shopping-clock";

afterEach(() => {
	vi.useRealTimers();
});

describe("ShoppingClock", () => {
	it("いまの日時を出し、分が変わったら書き換える", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 10, 12, 20, 29, 50));

		render(<ShoppingClock />);

		expect(screen.getByText("11/12（木）20:29")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(10_000);
		});

		expect(screen.getByText("11/12（木）20:30")).toBeInTheDocument();
	});
});
