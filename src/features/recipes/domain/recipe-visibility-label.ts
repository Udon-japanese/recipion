import type { RecipeVisibility } from "./recipe-link-permission";

export const recipeVisibilityLabels: Record<RecipeVisibility, string> = {
	private: "非公開",
	unlisted: "限定公開",
	public: "全体公開",
};
