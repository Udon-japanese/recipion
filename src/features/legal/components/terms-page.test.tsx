import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contactEmail, termsArticles } from "../domain/terms-content";
import { TermsPage } from "./terms-page";

describe("TermsPage", () => {
	it("すべての条と、連絡先を表示する。草案の注意書きは出さない", () => {
		render(<TermsPage />);

		for (const article of termsArticles) {
			expect(
				screen.getByRole("heading", { name: article.title }),
			).toBeInTheDocument();
		}

		expect(
			screen.getAllByText(new RegExp(contactEmail, "u")).length,
		).toBeGreaterThan(0);
		expect(screen.queryByText(/草案/u)).toBeNull();
	});
});
