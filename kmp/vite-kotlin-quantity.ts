// KMP_QUANTITY=1 のとき、quantity の domain を Kotlin/JS の版に差し替える。
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const adapter = fileURLToPath(
	new URL("../src/features/quantity/kotlin/kotlin-quantity.ts", import.meta.url),
);
const replaced = /\/features\/quantity\/domain\/(parse-quantity-input|kanji-numeral|format-quantity)(\.ts)?$/u;

export function kotlinQuantity(): Plugin | null {
	if (process.env.KMP_QUANTITY !== "1") {
		return null;
	}

	return {
		name: "kotlin-quantity",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!importer || importer === adapter) {
				return null;
			}

			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

			return resolved && replaced.test(resolved.id.replace(/\?.*$/u, "")) ? adapter : null;
		},
	};
}
