import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { privacySections } from "../domain/privacy-content";
import { contactEmail } from "../domain/terms-content";
import { PrivacyPage } from "./privacy-page";

describe("PrivacyPage", () => {
	it("すべての項目と、連絡先を表示する", () => {
		render(<PrivacyPage />);

		for (const section of privacySections) {
			expect(
				screen.getByRole("heading", { name: section.title }),
			).toBeInTheDocument();
		}

		expect(
			screen.getAllByText(new RegExp(contactEmail, "u")).length,
		).toBeGreaterThan(0);
	});

	it("実際に使っている外部のサービスを、すべて書いている", () => {
		render(<PrivacyPage />);

		for (const name of [
			"Cloudflare",
			"Neon",
			"Resend",
			"Turnstile",
			"Workers AI",
		]) {
			expect(screen.getAllByText(new RegExp(name, "u")).length).toBeGreaterThan(
				0,
			);
		}
	});
});
