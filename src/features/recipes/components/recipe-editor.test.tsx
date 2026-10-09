import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createRecipeEditorDocument,
	type RecipeEditorDocument,
} from "../domain/recipe-editor-document";
import { RecipeEditor } from "./recipe-editor";

beforeEach(() => {
	localStorage.clear();
});

afterEach(cleanup);

type User = ReturnType<typeof userEvent.setup>;

// タイトルは、クリックして編集する。
async function enterTitle(user: User, title: string) {
	await user.click(screen.getByRole("button", { name: "レシピ名を編集" }));
	await user.type(screen.getByRole("textbox", { name: "レシピ名" }), title);
	await user.keyboard("{Enter}");
}

// 本文を、入っている内容ごと置き換える。
async function writeBody(user: User, body: string) {
	const textarea = screen.getByRole("textbox", { name: "レシピの本文" });

	await user.clear(textarea);
	await user.click(textarea);
	await user.paste(body);
}

describe("RecipeEditor", () => {
	it("取り込んだ材料を既存グループへ移して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個");

		// 前提：「肉だね」がグループとして取り込まれている（なければここで落ちる）
		const initialSelect = screen.getByRole("combobox", {
			name: "豚ひき肉のグループ",
		});
		within(initialSelect).getByRole("option", { name: "肉だね" });

		// グループ外へ出す
		await user.selectOptions(initialSelect, "グループ外");
		const movedOutSelect = screen.getByRole("combobox", {
			name: "豚ひき肉のグループ",
		});
		expect(movedOutSelect).toHaveProperty("value", "");

		// 既存グループへ戻す（末尾に入るので順序が入れ替わる）
		await user.selectOptions(movedOutSelect, "肉だね");

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({
						type: "group",
						name: "肉だね",
						children: [
							expect.objectContaining({ type: "ingredient", name: "玉ねぎ" }),
							expect.objectContaining({ type: "ingredient", name: "豚ひき肉" }),
						],
					}),
				],
			}),
		);
	});

	it("不要な材料を削除でき、空になったグループも消える", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個");

		await user.click(screen.getByRole("button", { name: "豚ひき肉を削除" }));
		expect(screen.queryByRole("button", { name: "豚ひき肉を削除" })).toBeNull();
		expect(screen.getByRole("button", { name: "玉ねぎを削除" })).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "玉ねぎを削除" }));
		expect(screen.getByText("材料はまだありません。")).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ ingredients: [] }),
		);
	});

	it("推定されたグループ名を直して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個");

		const groupNameInput = screen.getByRole("textbox", {
			name: "肉だねのグループ名",
		});
		await user.clear(groupNameInput);
		await user.type(groupNameInput, "つくねのたね");

		// 材料のグループ選択肢にも新しい名前が反映される
		within(
			screen.getByRole("combobox", { name: "豚ひき肉のグループ" }),
		).getByRole("option", { name: "つくねのたね" });

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({
						type: "group",
						name: "つくねのたね",
						rawText: "つくねのたね",
					}),
				],
			}),
		);
	});

	it("材料を末尾に追加して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n玉ねぎ 1/2個");

		// 名前が空のうちは追加できない
		expect(screen.getByRole("button", { name: "材料を追加" })).toHaveProperty(
			"disabled",
			true,
		);

		const nameInput = screen.getByRole("textbox", { name: "追加する材料名" });
		const amountInput = screen.getByRole("textbox", {
			name: "追加する材料の分量",
		});
		await user.type(nameInput, "塩");
		// Enter で追加され、フォームは保存されない
		await user.type(amountInput, "少々{Enter}");

		expect(onSave).not.toHaveBeenCalled();
		expect(nameInput).toHaveProperty("value", "");
		expect(amountInput).toHaveProperty("value", "");

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({ type: "ingredient", name: "玉ねぎ" }),
					expect.objectContaining({
						type: "ingredient",
						status: "parsed",
						name: "塩",
						amountText: "少々",
					}),
				],
			}),
		);
	});

	it("材料の行の入力で Enter を押しても保存されない", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個");

		await user.type(
			screen.getByRole("textbox", { name: "豚ひき肉の材料名" }),
			"{Enter}",
		);
		await user.type(
			screen.getByRole("textbox", { name: "豚ひき肉の分量" }),
			"{Enter}",
		);
		await user.type(
			screen.getByRole("textbox", { name: "肉だねのグループ名" }),
			"{Enter}",
		);

		expect(onSave).not.toHaveBeenCalled();
	});

	it("グループを新規作成して材料を移し、保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await writeBody(user, "＜材料＞\n玉ねぎ 1/2個\n豚ひき肉 200g");

		// 名前が空のうちは作成できない
		expect(
			screen.getByRole("button", { name: "グループを追加" }),
		).toHaveProperty("disabled", true);

		await user.type(
			screen.getByRole("textbox", { name: "追加するグループ名" }),
			"肉だね{Enter}",
		);
		expect(onSave).not.toHaveBeenCalled();

		await user.selectOptions(
			screen.getByRole("combobox", { name: "豚ひき肉のグループ" }),
			"肉だね",
		);

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				ingredients: [
					expect.objectContaining({ type: "ingredient", name: "玉ねぎ" }),
					expect.objectContaining({
						type: "group",
						name: "肉だね",
						rawText: "肉だね",
						inferred: false,
						children: [expect.objectContaining({ name: "豚ひき肉" })],
					}),
				],
			}),
		);
	});

	it("材料のない新規グループは保存できず、削除すると保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await user.type(
			screen.getByRole("textbox", { name: "追加するグループ名" }),
			"たれ",
		);
		await user.click(screen.getByRole("button", { name: "グループを追加" }));

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		expect((await screen.findByRole("alert")).textContent).toContain(
			"材料のないグループ",
		);
		expect(onSave).not.toHaveBeenCalled();

		await user.click(
			screen.getByRole("button", { name: "たれのグループを削除" }),
		);
		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ ingredients: [] }),
		);
	});

	it("保存に成功したら、保存したレシピを onSaved に渡す", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "abc123",
		}));
		const onSaved = vi.fn();

		render(<RecipeEditor onSave={onSave} onSaved={onSaved} />);

		await enterTitle(user, "つくね");
		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSaved).toHaveBeenCalledWith({ publicId: "abc123" });
		// 引用元URLは任意なので、未入力でも保存できる
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ sourceUrl: null }),
		);
	});

	it("引用元URLを入力して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "abc123",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "つくね");
		await user.type(
			screen.getByRole("textbox", { name: "引用元URL（任意）" }),
			"https://example.com/recipe/1",
		);
		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ sourceUrl: "https://example.com/recipe/1" }),
		);
	});

	it("保存済みのレシピを初期値として編集し、材料のIDを保ったまま保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "abc123",
		}));
		const initialDocument = createRecipeEditorDocument({
			name: "つくね",
			servings: 4,
			ingredientText: "肉だね\n豚ひき肉 200g\n玉ねぎ 1/2個",
			preparationText: "玉ねぎをみじん切りにする\n卵を溶いておく",
			instructionText: "1. 材料を混ぜる\n2. フライパンで焼く\n途中で裏返す",
			note: "焼きすぎない",
			sourceUrl: "https://example.com/recipe/1",
		});

		render(<RecipeEditor onSave={onSave} initialDocument={initialDocument} />);

		// 保存済みの内容が、入力欄に入っている
		expect(screen.getByText("レシピを編集")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "レシピ名を編集" }).textContent,
		).toBe("つくね");
		expect(screen.getByRole("spinbutton", { name: "何人分" })).toHaveProperty(
			"value",
			"4",
		);
		expect(
			screen.getByRole("textbox", { name: "豚ひき肉の分量" }),
		).toHaveProperty("value", "200g");

		await user.click(screen.getByRole("button", { name: "レシピ名を編集" }));
		const nameInput = screen.getByRole("textbox", { name: "レシピ名" });
		await user.clear(nameInput);
		await user.type(nameInput, "鶏つくね");
		await user.keyboard("{Enter}");
		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		const saved = onSave.mock.calls[0]?.[0];

		expect(saved?.name).toBe("鶏つくね");
		expect(saved?.servings).toBe(4);
		expect(saved?.note).toBe("焼きすぎない");
		// 材料は、グループも含めて、同じ ID のまま保存される
		expect(saved?.ingredients).toEqual(initialDocument.ingredients);
		// 下準備・作り方は、複数行の項目も含めて、元の内容に戻る
		expect(saved?.preparations.map((item) => item.text)).toEqual(
			initialDocument.preparations.map((item) => item.text),
		);
		expect(saved?.instructions.map((item) => item.text)).toEqual(
			initialDocument.instructions.map((item) => item.text),
		);
	});

	it("タイトルは、Esc を押しても、入力した内容のまま確定する", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "レシピ名を編集" }));
		await user.type(
			screen.getByRole("textbox", { name: "レシピ名" }),
			"つくね",
		);
		await user.keyboard("{Escape}");

		expect(
			screen.getByRole("button", { name: "レシピ名を編集" }).textContent,
		).toBe("つくね");
	});

	it("タイトルは、フォーカスが外れても、確定する", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: "レシピ名を編集" }));
		await user.type(
			screen.getByRole("textbox", { name: "レシピ名" }),
			"つくね",
		);
		await user.tab();

		expect(
			screen.getByRole("button", { name: "レシピ名を編集" }).textContent,
		).toBe("つくね");
	});

	it("入力欄の本文から、プレビューを作る", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(
			user,
			"＜材料＞\n卵 1個\n\n＜下準備＞\n玉ねぎを切る\n\n＜作り方＞\n1. 混ぜる\n2. 焼く\n\n＜メモ＞\n冷凍できる",
		);

		expect(screen.getByRole("textbox", { name: "卵の材料名" })).toBeTruthy();
		expect(screen.getByText("玉ねぎを切る")).toBeTruthy();
		expect(screen.getByText("混ぜる")).toBeTruthy();
		expect(screen.getByText("焼く")).toBeTruthy();
		expect(screen.getByText("冷凍できる")).toBeTruthy();
	});

	it("見出しがなくても、材料と作り方を判別して保存できる", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
			publicId: "recipe-1",
		}));

		render(<RecipeEditor onSave={onSave} />);

		await enterTitle(user, "卵焼き");
		await writeBody(user, "・卵 3個\n・砂糖 大さじ1\n\n1. 混ぜる\n2. 焼く");
		await user.click(screen.getByRole("button", { name: "レシピを保存" }));
		await screen.findByText("レシピを保存しました。");

		const saved = onSave.mock.calls[0]?.[0];

		expect(saved?.ingredients.map((node) => node.type)).toEqual([
			"ingredient",
			"ingredient",
		]);
		expect(saved?.ingredients[0]).toMatchObject({ name: "卵" });
		expect(saved?.instructions.map((item) => item.text)).toEqual([
			"混ぜる",
			"焼く",
		]);
	});

	it("分類できなかった文章を、保存されないと知らせる", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "ハンバーグ");

		expect(screen.getByText("分類できなかった文章")).toBeTruthy();
	});

	it("プレビューで直した分量を、本文の別の行を書き換えても、保つ", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "＜材料＞\n卵 1個\n牛乳 200ml");

		const amount = screen.getByRole("textbox", { name: "卵の分量" });

		await user.clear(amount);
		await user.type(amount, "2個");
		expect(screen.getAllByText("手直し済み")).toHaveLength(1);

		// 本文を、1回の変更で書き換える（いったん空にすると、材料ごと消えるため）。
		fireEvent.change(screen.getByRole("textbox", { name: "レシピの本文" }), {
			target: { value: "＜材料＞\n卵 1個\n牛乳 300ml" },
		});

		expect(screen.getByRole("textbox", { name: "卵の分量" })).toHaveProperty(
			"value",
			"2個",
		);
		expect(screen.getByRole("textbox", { name: "牛乳の分量" })).toHaveProperty(
			"value",
			"300ml",
		);
	});

	it("元の行を書き換えると、手直しは解析し直される", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "＜材料＞\n卵 1個");
		const amount = screen.getByRole("textbox", { name: "卵の分量" });

		await user.clear(amount);
		await user.type(amount, "2個");

		await writeBody(user, "＜材料＞\n卵 3個");

		expect(screen.getByRole("textbox", { name: "卵の分量" })).toHaveProperty(
			"value",
			"3個",
		);
		expect(screen.queryByText("手直し済み")).toBeNull();
	});

	it("手直しを元に戻せる", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "＜材料＞\n卵 1個");
		const amount = screen.getByRole("textbox", { name: "卵の分量" });

		await user.clear(amount);
		await user.type(amount, "2個");
		await user.click(
			screen.getByRole("button", { name: "卵の手直しを元に戻す" }),
		);

		expect(screen.getByRole("textbox", { name: "卵の分量" })).toHaveProperty(
			"value",
			"1個",
		);
		expect(screen.queryByText("手直し済み")).toBeNull();
	});

	it("プレビューで消した材料は、本文に残っていても、出てこない", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "＜材料＞\n卵 1個\n牛乳 200ml");
		await user.click(screen.getByRole("button", { name: "卵を削除" }));

		const textarea = screen.getByRole("textbox", { name: "レシピの本文" });

		await user.click(textarea);
		await user.keyboard("{Control>}{End}{/Control}\n塩 少々");

		expect(screen.queryByRole("textbox", { name: "卵の材料名" })).toBeNull();
		expect(screen.getByRole("textbox", { name: "塩の材料名" })).toBeTruthy();
	});

	it("見出しの人数を、人数の欄に入れる（自分で直したあとは、変えない）", async () => {
		const user = userEvent.setup();

		render(<RecipeEditor onSave={vi.fn()} />);

		await writeBody(user, "＜材料（4人分）＞\n卵 1個");
		expect(screen.getByRole("spinbutton", { name: "何人分" })).toHaveProperty(
			"value",
			"4",
		);

		const servings = screen.getByRole("spinbutton", { name: "何人分" });

		await user.clear(servings);
		await user.type(servings, "3");
		await writeBody(user, "＜材料（6人分）＞\n卵 1個");

		expect(servings).toHaveProperty("value", "3");
	});

	it("レシピ名が空のまま保存しようとすると、知らせて、名前の入力に移る", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();

		render(<RecipeEditor onSave={onSave} />);

		await user.click(screen.getByRole("button", { name: "レシピを保存" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"レシピ名を入力",
		);
		expect(screen.getByRole("textbox", { name: "レシピ名" })).toBeTruthy();
		expect(onSave).not.toHaveBeenCalled();
	});

	describe("見出しの雛形", () => {
		it("新規登録は、見出しだけが入った状態で開く", () => {
			render(<RecipeEditor onSave={vi.fn()} />);

			expect(
				screen.getByRole("textbox", { name: "レシピの本文" }),
			).toHaveProperty(
				"value",
				"＜材料＞\n\n＜下準備＞\n\n＜作り方＞\n\n＜メモ＞\n",
			);
		});

		it("切り替えで、雛形を外せて、次に開いたときも保たれる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.click(
				screen.getByRole("checkbox", {
					name: "新規登録で、見出しを最初から入れる",
				}),
			);
			expect(
				screen.getByRole("textbox", { name: "レシピの本文" }),
			).toHaveProperty("value", "");

			cleanup();
			render(<RecipeEditor onSave={vi.fn()} />);

			expect(
				screen.getByRole("textbox", { name: "レシピの本文" }),
			).toHaveProperty("value", "");
			expect(
				screen.getByRole("checkbox", {
					name: "新規登録で、見出しを最初から入れる",
				}),
			).toHaveProperty("checked", false);
		});

		it("書いた文章は、切り替えても消えない", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await writeBody(user, "＜材料＞\n卵 1個");
			await user.click(
				screen.getByRole("checkbox", {
					name: "新規登録で、見出しを最初から入れる",
				}),
			);

			expect(
				screen.getByRole("textbox", { name: "レシピの本文" }),
			).toHaveProperty("value", "＜材料＞\n卵 1個");
		});

		it("編集では、切り替えを出さない", () => {
			render(
				<RecipeEditor
					onSave={vi.fn()}
					initialDocument={createRecipeEditorDocument({ name: "つくね" })}
				/>,
			);

			expect(
				screen.queryByRole("checkbox", {
					name: "新規登録で、見出しを最初から入れる",
				}),
			).toBeNull();
		});
	});

	describe("補完", () => {
		function bodyTextarea() {
			return screen.getByRole("textbox", { name: "レシピの本文" });
		}

		it("見出しの飾りを打つと、見出しが候補に出て、Tab で入れられる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "＜作");
			expect(screen.getByRole("button", { name: "＜作り方＞" })).toBeTruthy();

			await user.keyboard("{Tab}");

			expect(bodyTextarea()).toHaveProperty("value", "＜作り方＞\n");
			expect(screen.queryByRole("list", { name: "補完の候補" })).toBeNull();
		});

		it("選んでいないときの Enter は、改行になる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "＜{Enter}");

			expect(bodyTextarea()).toHaveProperty("value", "＜\n");
		});

		it("↑↓で選んで、Enter で入れられる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "＜{ArrowDown}{ArrowDown}{Enter}");

			expect(bodyTextarea()).toHaveProperty("value", "＜下準備＞\n");
		});

		it("Esc で閉じられる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "＜{Escape}");

			expect(screen.queryByRole("list", { name: "補完の候補" })).toBeNull();
			expect(bodyTextarea()).toHaveProperty("value", "＜");
		});

		it("材料の行では、ひらがなから、カタログの食材名を出し、タップで入れられる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await writeBody(user, "＜材料＞\n");
			await user.type(bodyTextarea(), "たまね");
			await user.click(screen.getByRole("button", { name: "玉ねぎ" }));

			expect(bodyTextarea()).toHaveProperty("value", "＜材料＞\n玉ねぎ");
		});

		it("作り方では、材料に書いた名前を出す", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await writeBody(user, "＜材料＞\n豚ひき肉 200g\n\n＜作り方＞\n1. ");
			await user.type(bodyTextarea(), "豚ひ{Tab}");

			expect(bodyTextarea()).toHaveProperty(
				"value",
				"＜材料＞\n豚ひき肉 200g\n\n＜作り方＞\n1. 豚ひき肉",
			);
		});
	});

	describe("番号・中黒の自動入力", () => {
		function bodyTextarea() {
			return screen.getByRole("textbox", { name: "レシピの本文" });
		}

		it("番号の行で Enter を押すと、次の番号が入る", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "1. 混ぜる{Enter}焼く{Enter}");

			expect(bodyTextarea()).toHaveProperty("value", "1. 混ぜる\n2. 焼く\n3. ");
		});

		it("印だけの行で Enter を押すと、印が消える", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "・切る{Enter}{Enter}");

			expect(bodyTextarea()).toHaveProperty("value", "・切る\n");
		});

		it("Shift+Enter は、印を付けない改行になる", async () => {
			const user = userEvent.setup();

			render(<RecipeEditor onSave={vi.fn()} />);

			await user.clear(bodyTextarea());
			await user.type(bodyTextarea(), "1. 混ぜる{Shift>}{Enter}{/Shift}続き");

			expect(bodyTextarea()).toHaveProperty("value", "1. 混ぜる\n続き");
		});
	});

	describe("レシピへのリンク", () => {
		const targets = [
			{
				publicId: "curry-id",
				name: "カレー",
				createdAt: "2026-10-01T00:00:00+09:00",
			},
			{
				publicId: "rice-id",
				name: "ごはん",
				createdAt: "2026-10-01T00:00:00+09:00",
			},
		];

		const bodyTextarea = () =>
			screen.getByRole("textbox", { name: "レシピの本文" });

		async function openPicker(user: User) {
			await user.click(
				screen.getByRole("button", { name: "現在の位置にレシピをリンク" }),
			);
		}

		it("ボタンで、カーソルの位置に、[[名前]] を入れて、リンク先を保存できる", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "new",
			}));

			render(
				<RecipeEditor onSave={onSave} loadLinkTargets={async () => targets} />,
			);
			await enterTitle(user, "カレー丼");
			await writeBody(user, "＜作り方＞\n1. ");
			await screen.findByRole("button", { name: "現在の位置にレシピをリンク" });
			await openPicker(user);
			await user.click(await screen.findByRole("button", { name: "カレー" }));

			expect(bodyTextarea()).toHaveProperty(
				"value",
				"＜作り方＞\n1. [[カレー]]",
			);
			// プレビューに、リンクと、リンク先の名前が出る。
			expect(
				screen.getByText("[[カレー]]", { selector: "code" }).parentElement
					?.textContent,
			).toContain("→ カレー");
			expect(screen.queryByText("リンク先が未設定")).toBeNull();

			await user.click(screen.getByRole("button", { name: "レシピを保存" }));
			await screen.findByText("レシピを保存しました。");

			expect(onSave.mock.calls[0]?.[0].links).toEqual([
				{ label: "カレー", targetPublicId: "curry-id" },
			]);
		});

		it("手で書いたリンクは、「リンク先が未設定」と出て、「選ぶ」でリンク先を決められる", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "new",
			}));

			render(
				<RecipeEditor onSave={onSave} loadLinkTargets={async () => targets} />,
			);
			await enterTitle(user, "カレー丼");
			await writeBody(user, "＜作り方＞\n1. [[カレー]]をかける");

			expect(screen.getByText("リンク先が未設定")).toBeTruthy();

			await user.click(screen.getByRole("button", { name: "選ぶ" }));
			await user.click(await screen.findByRole("button", { name: "カレー" }));

			expect(screen.queryByText("リンク先が未設定")).toBeNull();

			await user.click(screen.getByRole("button", { name: "レシピを保存" }));
			await screen.findByText("レシピを保存しました。");

			expect(onSave.mock.calls[0]?.[0].links).toEqual([
				{ label: "カレー", targetPublicId: "curry-id" },
			]);
			// 本文は、変わらない。
			expect(bodyTextarea()).toHaveProperty(
				"value",
				"＜作り方＞\n1. [[カレー]]をかける",
			);
		});

		it("本文から消したリンクは、保存されない", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "new",
			}));

			render(
				<RecipeEditor onSave={onSave} loadLinkTargets={async () => targets} />,
			);
			await enterTitle(user, "カレー丼");
			await writeBody(user, "＜作り方＞\n1. ");
			await screen.findByRole("button", { name: "現在の位置にレシピをリンク" });
			await openPicker(user);
			await user.click(await screen.findByRole("button", { name: "ごはん" }));
			await writeBody(user, "＜作り方＞\n1. 盛る");
			await user.click(screen.getByRole("button", { name: "レシピを保存" }));
			await screen.findByText("レシピを保存しました。");

			expect(onSave.mock.calls[0]?.[0].links).toEqual([]);
		});

		it("編集のとき、保存済みのリンクを、そのまま持ち越す", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "abc",
			}));
			const initial = {
				...createRecipeEditorDocument({
					name: "カレー丼",
					instructionText: "1. [[カレー]]をかける",
				}),
				links: [{ label: "カレー", targetPublicId: "curry-id" }],
			};

			render(
				<RecipeEditor
					initialDocument={initial}
					onSave={onSave}
					loadLinkTargets={async () => targets}
				/>,
			);
			await screen.findByText(/→ カレー/);
			await user.click(screen.getByRole("button", { name: "レシピを保存" }));
			await screen.findByText("レシピを保存しました。");

			expect(onSave.mock.calls[0]?.[0].links).toEqual([
				{ label: "カレー", targetPublicId: "curry-id" },
			]);
		});

		it("同じ名前のレシピが2つあるとき、2つ目のラベルには番号が付く（ボタンで続けて入れる）", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "new",
			}));

			render(
				<RecipeEditor
					onSave={onSave}
					loadLinkTargets={async () => [
						{
							publicId: "a",
							name: "カレー",
							createdAt: "2026-10-01T00:00:00+09:00",
						},
						{
							publicId: "b",
							name: "カレー",
							createdAt: "2026-10-01T00:00:00+09:00",
						},
					]}
				/>,
			);
			await enterTitle(user, "カレー丼");
			await writeBody(user, "＜作り方＞\n1. ");
			await screen.findByRole("button", { name: "現在の位置にレシピをリンク" });
			await openPicker(user);
			await user.click(
				(
					await screen.findAllByRole("button", { name: /^カレー/ })
				)[0] as HTMLElement,
			);
			await openPicker(user);
			await user.click(
				(
					await screen.findAllByRole("button", { name: /^カレー/ })
				)[1] as HTMLElement,
			);

			expect(bodyTextarea()).toHaveProperty(
				"value",
				"＜作り方＞\n1. [[カレー]][[カレー（2）]]",
			);

			await user.click(screen.getByRole("button", { name: "レシピを保存" }));
			await screen.findByText("レシピを保存しました。");

			expect(onSave.mock.calls[0]?.[0].links).toEqual([
				{ label: "カレー", targetPublicId: "a" },
				{ label: "カレー（2）", targetPublicId: "b" },
			]);
		});

		it("同じ名前のレシピが2つあるとき、補完で続けて入れても、2つ目のラベルには番号が付く", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(async (_document: RecipeEditorDocument) => ({
				publicId: "new",
			}));

			render(
				<RecipeEditor
					onSave={onSave}
					loadLinkTargets={async () => [
						{
							publicId: "a",
							name: "カレー",
							createdAt: "2026-10-01T00:00:00+09:00",
						},
						{
							publicId: "b",
							name: "カレー",
							createdAt: "2026-10-01T00:00:00+09:00",
						},
					]}
				/>,
			);
			await enterTitle(user, "カレー丼");
			await writeBody(user, "＜作り方＞\n1. ");
			await screen.findByRole("button", { name: "現在の位置にレシピをリンク" });
			// user-event では、[[ が [ 1文字を表すので、[[[[ と書く。
			await user.type(bodyTextarea(), "[[[[");

			const first = within(
				await screen.findByLabelText("補完の候補"),
			).getAllByRole("button");

			await user.click(first[0] as HTMLElement);
			await user.type(bodyTextarea(), "[[[[");

			const second = within(
				await screen.findByLabelText("補完の候補"),
			).getAllByRole("button");

			// 1つ目の（カレー）は、すでに使っているので、2つ目の候補（別のレシピ）が、番号つきで入る。
			await user.click(second[1] as HTMLElement);

			expect(bodyTextarea()).toHaveProperty(
				"value",
				"＜作り方＞\n1. [[カレー]][[カレー（2）]]",
			);
		});

		it("リンクの入力は、loadLinkTargets がなければ出ない", () => {
			render(<RecipeEditor onSave={vi.fn()} />);

			expect(
				screen.queryByRole("button", { name: "現在の位置にレシピをリンク" }),
			).toBeNull();
		});
	});
});
