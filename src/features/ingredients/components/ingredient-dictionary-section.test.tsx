import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserFacingError } from "#/errors/user-facing-error";
import { buildDictionaryEntry } from "#/test/builders/build-ingredient-dictionary";
import type { IngredientDictionaryRepository } from "../application/ingredient-dictionary-repository";
import {
	type IngredientDictionaryCommand,
	manageIngredientDictionary,
} from "../application/manage-ingredient-dictionary";
import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";
import { IngredientDictionarySection } from "./ingredient-dictionary-section";

const dashiId = "00000000-0000-4000-8000-000000000001";
const eggId = "00000000-0000-4000-8000-000000000002";

// メモリの上で本当に動く辞書（サーバーでの確かめも、本物の manageIngredientDictionary を通す）。
function createStore(initial: IngredientDictionaryEntry[]) {
	let entries = [...initial];
	const repository: IngredientDictionaryRepository = {
		list: async () => entries,
		create: async (name) => {
			entries = [...entries, buildDictionaryEntry({ id: `new-${name}`, name })];

			return `new-${name}`;
		},
		rename: async (id, name) => {
			entries = entries.map((entry) =>
				entry.id === id ? { ...entry, name } : entry,
			);
		},
		addAlias: async (id, alias) => {
			entries = entries.map((entry) =>
				entry.id === id
					? { ...entry, aliases: [...entry.aliases, alias] }
					: entry,
			);
		},
		removeAlias: async (id, alias) => {
			entries = entries.map((entry) =>
				entry.id === id
					? {
							...entry,
							aliases: entry.aliases.filter((name) => name !== alias),
						}
					: entry,
			);
		},
		remove: async (id) => {
			entries = entries.filter((entry) => entry.id !== id);
		},
		setUnmanaged: async (id, unmanaged) => {
			entries = entries.map((entry) =>
				entry.id === id ? { ...entry, unmanaged } : entry,
			);
		},
	};
	const runCommand = vi.fn((command: IngredientDictionaryCommand) =>
		manageIngredientDictionary(command, repository),
	);

	render(
		<IngredientDictionarySection
			loadEntries={() => repository.list()}
			runCommand={runCommand}
		/>,
	);

	return { runCommand };
}

const dashi = buildDictionaryEntry({ id: dashiId, name: "マイだし" });
const egg = buildDictionaryEntry({
	id: eggId,
	name: "卵",
	aliases: ["たまご", "玉子"],
	hasInventory: true,
});

function list() {
	return screen.getByRole("list", { name: "自分の材料" });
}

describe("IngredientDictionarySection", () => {
	it("材料を足すと、一覧に出て、ボタンで「足しました」と伝える", async () => {
		const user = userEvent.setup();

		createStore([dashi]);
		await screen.findByText("マイだし");

		await user.type(screen.getByLabelText("新しい材料の名前"), "うちのたれ");
		await user.click(screen.getByRole("button", { name: "足す" }));

		expect(await within(list()).findByText("うちのたれ")).toBeInTheDocument();
		expect(
			await screen.findByText("足しました", { selector: "output" }),
		).toBeInTheDocument();
	});

	it("呼び名を足して、消せる（カタログの別名は出さない）", async () => {
		const user = userEvent.setup();

		createStore([egg]);
		await user.click(await screen.findByRole("button", { name: "卵を直す" }));

		expect(screen.getByText("まだありません。")).toBeInTheDocument();
		await user.type(screen.getByLabelText("卵の呼び名を足す"), "タマ");
		await user.click(screen.getByRole("button", { name: "呼び名を足す" }));

		const aliases = await screen.findByRole("list", { name: "卵の呼び名" });
		expect(within(aliases).getByText("タマ")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "呼び名「タマ」を消す" }),
		);
		await waitFor(() =>
			expect(screen.queryByRole("list", { name: "卵の呼び名" })).toBeNull(),
		);
	});

	it("使えない呼び名（別のカタログの食材の別名）は、送らずに理由を出す", async () => {
		const user = userEvent.setup();
		const { runCommand } = createStore([dashi]);

		await user.click(
			await screen.findByRole("button", { name: "マイだしを直す" }),
		);
		await user.type(
			screen.getByLabelText("マイだしの呼び名を足す"),
			"しょうゆ",
		);
		await user.click(screen.getByRole("button", { name: "呼び名を足す" }));

		expect(screen.getByRole("alert")).toHaveTextContent("呼び名にできません");
		expect(runCommand).not.toHaveBeenCalled();
	});

	it("在庫のある材料は消せず、ない材料は消せる", async () => {
		const user = userEvent.setup();
		const { runCommand } = createStore([egg, dashi]);

		await user.click(await screen.findByRole("button", { name: "卵を直す" }));
		await user.click(screen.getByRole("button", { name: "卵を消す" }));
		expect(runCommand).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "マイだしを直す" }));
		await user.click(screen.getByRole("button", { name: "マイだしを消す" }));
		await waitFor(() =>
			expect(within(list()).queryByText("マイだし")).toBeNull(),
		);
	});

	it("サーバーで断られたら、その理由を出す", async () => {
		const user = userEvent.setup();

		render(
			<IngredientDictionarySection
				loadEntries={async () => [dashi]}
				runCommand={async () => {
					throw new UserFacingError("材料は500個までです");
				}}
			/>,
		);
		await screen.findByText("マイだし");

		await user.type(screen.getByLabelText("新しい材料の名前"), "うちのたれ");
		await user.click(screen.getByRole("button", { name: "足す" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"材料は500個までです",
		);
	});
});

describe("IngredientDictionarySection（管理しない）", () => {
	it("在庫のない材料は「管理しない」を切り替えられ、一覧に札が出る。在庫のある材料は切り替えられない", async () => {
		const user = userEvent.setup();

		createStore([dashi, egg]);

		await user.click(
			await screen.findByRole("button", { name: "マイだしを直す" }),
		);
		await user.click(
			screen.getByRole("switch", { name: "マイだしを管理しない" }),
		);

		// 行の頭（名前と「直す」の並び）に、札が出る。
		const rowHead = screen.getByRole("button", {
			name: "マイだしを直す",
		}).parentElement;

		if (!rowHead) throw new Error("行が見つかりません");

		expect(await within(rowHead).findByText("管理しない")).toBeInTheDocument();
		expect(
			screen.getByRole("switch", { name: "マイだしを管理しない" }),
		).toBeChecked();

		await user.click(screen.getByRole("button", { name: "卵を直す" }));
		expect(
			screen.getByRole("switch", { name: "卵を管理しない" }),
		).toBeDisabled();
		expect(
			screen.getByText("在庫にあるため、切り替えられません"),
		).toBeInTheDocument();
	});
});
