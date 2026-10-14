import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateWithWeekday } from "../../domain/expiry-labels";
import { addDays, toDateString } from "../../domain/inventory-lot";
import { InventoryRegistrationPanel } from "./registration-panel";
import { useInventoryRegistration } from "./use-inventory-registration";

type HarnessProps = Parameters<typeof useInventoryRegistration>[0];

// 登録のパネルを、開いた状態で出す（状態は、開く側が持つ）。
function Harness(props: HarnessProps) {
	const registration = useInventoryRegistration(props);

	return (
		<InventoryRegistrationPanel
			open
			onOpenChange={() => {}}
			registration={registration}
			onOpenSettings={() => {}}
		/>
	);
}

afterEach(() => {
	// 覚えた期限（過去の入力）が、テストの間で残らないようにする。
	localStorage.clear();
});

describe("InventoryRegistrationPanel", () => {
	it("カタログにある食材は、単位と管理方法を自動で入れ、数量つきで登録する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});
		const onRegistered = vi.fn();

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "卵");

		// 卵は、「個」で、正確に管理
		expect(screen.getByRole("combobox", { name: "在庫の単位" })).toHaveValue(
			"count:個",
		);
		expect(
			screen.getByRole("button", { name: "正確", pressed: true }),
		).toBeInTheDocument();

		await user.type(screen.getByLabelText(/^数量/u), "6");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "卵",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					trackingMode: "exact",
					initialQuantity: 6,
					transactionId: expect.any(String),
				}),
			),
		);
		expect(onRegistered).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("卵を在庫に追加しました"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("食材名")).toHaveValue("");
	});

	it("数量が空欄なら、食材だけを登録する（初期数量0）", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "醤油");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "醤油",
					stockUnitCode: "ml",
					initialQuantity: 0,
				}),
			),
		);
	});

	it("数量が負なら、送信せずに理由を表示する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn();

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "薄力粉");
		await user.type(screen.getByLabelText(/^数量/u), "-5");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"数量を確認してください",
		);
		expect(registerInventoryItem).not.toHaveBeenCalled();
	});

	it("登録に失敗したら、入力を残して、失敗を表示する", async () => {
		const user = userEvent.setup();
		const onRegistered = vi.fn();

		render(
			<Harness
				registerInventoryItem={vi.fn().mockRejectedValue(new Error("network"))}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "塩");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"在庫に追加できませんでした",
		);
		expect(screen.getByLabelText("食材名")).toHaveValue("塩");
		expect(onRegistered).not.toHaveBeenCalled();
	});

	it("「ある」を押すと、数量を入れず、有無だけで登録する", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});
		const onRegistered = vi.fn();

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={onRegistered}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "薄力粉");
		await user.type(screen.getByLabelText(/^数量/u), "500");
		await user.click(screen.getByRole("button", { name: /^ある/u }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "薄力粉",
					stockUnitCode: "g",
					initialQuantity: 0,
					markAsAvailable: true,
				}),
			),
		);
		expect(onRegistered).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("薄力粉を「ある」で登録しました"),
		).toBeInTheDocument();
	});

	it("調味料は、最初から「有無だけ」になり、数量の欄がない。小麦粉は、量を追う", async () => {
		const user = userEvent.setup();

		render(<Harness registerInventoryItem={vi.fn()} onRegistered={() => {}} />);

		await user.type(screen.getByLabelText("食材名"), "塩");

		expect(
			screen.getByRole("button", { name: "有無だけ", pressed: true }),
		).toBeInTheDocument();
		expect(screen.queryByLabelText(/^数量/u)).toBeNull();

		await user.clear(screen.getByLabelText("食材名"));
		await user.type(screen.getByLabelText("食材名"), "薄力粉");

		expect(
			screen.getByRole("button", { name: "だいたい", pressed: true }),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/^数量/u)).toBeInTheDocument();
	});

	it("管理方法を「有無だけ」にすると、数量の欄を隠し、登録は「ある」になる", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "オリーブオイル");
		await user.click(screen.getByRole("button", { name: "有無だけ" }));

		expect(screen.queryByLabelText(/^数量/u)).toBeNull();

		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "オリーブオイル",
					trackingMode: "presence",
					initialQuantity: 0,
					markAsAvailable: true,
				}),
			),
		);
	});

	it("在庫の単位は、マスタにある単位だけが選べる（鶏もも肉は g と枚。ml や個は出ない）", async () => {
		const user = userEvent.setup();

		render(<Harness registerInventoryItem={vi.fn()} onRegistered={() => {}} />);

		await user.type(screen.getByLabelText("食材名"), "鶏もも肉");

		const unitSelect = screen.getByRole("combobox", { name: "在庫の単位" });

		expect(
			within(unitSelect)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["g", "枚"]);
		expect(unitSelect).toHaveValue("g:g");
	});

	it("マスタにない食材は、g・ml・個に加えて、自分で呼び名を入力して登録できる", async () => {
		const user = userEvent.setup();
		const registerInventoryItem = vi.fn().mockResolvedValue({});

		render(
			<Harness
				registerInventoryItem={registerInventoryItem}
				onRegistered={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText("食材名"), "謎の缶詰");
		await user.selectOptions(
			screen.getByRole("combobox", { name: "在庫の単位" }),
			"custom",
		);
		await user.type(screen.getByLabelText("単位の呼び名"), "缶");
		await user.type(screen.getByLabelText(/^数量/u), "2");
		await user.click(screen.getByRole("button", { name: "在庫に追加" }));

		await waitFor(() =>
			expect(registerInventoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					ingredientName: "謎の缶詰",
					stockUnitCode: "count",
					stockUnitLabel: "缶",
					initialQuantity: 2,
				}),
			),
		);
	});

	it("食材名の候補から選ぶと、単位が入る", async () => {
		const user = userEvent.setup();

		render(<Harness registerInventoryItem={vi.fn()} onRegistered={() => {}} />);

		await user.type(screen.getByLabelText("食材名"), "しょう");
		await user.click(await screen.findByRole("option", { name: "醤油" }));

		expect(screen.getByLabelText("食材名")).toHaveValue("醤油");
		expect(screen.getByRole("combobox", { name: "在庫の単位" })).toHaveValue(
			"ml:ml",
		);
	});

	describe("期限の目安", () => {
		const today = toDateString(new Date());

		it("期限の欄の横に、今日の日付（曜日つき）を、小さく表示する", async () => {
			render(
				<Harness registerInventoryItem={vi.fn()} onRegistered={() => {}} />,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			expect(
				screen.getByText(`今日 ${formatDateWithWeekday(today)}`),
			).toBeInTheDocument();
		});

		it("目安を付けられる食材は、日付を自動で入れ、「約」の注意を出し、出所を目安として送る", async () => {
			const user = userEvent.setup();
			const registerInventoryItem = vi.fn().mockResolvedValue({});

			render(
				<Harness
					registerInventoryItem={registerInventoryItem}
					onRegistered={() => {}}
				/>,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "冷凍ブロッコリー");

			// 冷凍野菜：90日（短め）
			expect(screen.getByLabelText("期限")).toHaveValue(addDays(today, 90));
			expect(screen.getByLabelText("期限の種類")).toHaveValue("best-before");
			expect(screen.getByText(/目安の日付（約）です/u)).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "在庫に追加" }));

			await waitFor(() =>
				expect(registerInventoryItem).toHaveBeenCalledWith(
					expect.objectContaining({
						lot: {
							expiresOn: addDays(today, 90),
							expirySource: "estimated",
							expiryKind: "best-before",
						},
					}),
				),
			);
		});

		it("日付を直すと、目安ではなく、入力として送る", async () => {
			const user = userEvent.setup();
			const registerInventoryItem = vi.fn().mockResolvedValue({});

			render(
				<Harness
					registerInventoryItem={registerInventoryItem}
					onRegistered={() => {}}
				/>,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "冷凍ブロッコリー");
			await user.click(
				screen.getByRole("button", { name: "期限を明日にする" }),
			);

			expect(screen.queryByText(/目安の日付（約）です/u)).toBeNull();

			await user.click(screen.getByRole("button", { name: "在庫に追加" }));

			await waitFor(() =>
				expect(registerInventoryItem).toHaveBeenCalledWith(
					expect.objectContaining({
						lot: expect.objectContaining({
							expiresOn: addDays(today, 1),
							expirySource: "entered",
						}),
					}),
				),
			);
		});

		it("「オフ」では、日付を自動で入れない（期限の種類の初期値は入れる）", async () => {
			const user = userEvent.setup();

			render(
				<Harness
					registerInventoryItem={vi.fn()}
					onRegistered={() => {}}
					expiryEstimateLevel="off"
				/>,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "冷凍ブロッコリー");

			expect(screen.getByLabelText("期限")).toHaveValue("");
			expect(screen.getByLabelText("期限の種類")).toHaveValue("best-before");
		});

		it("傷みやすい食材は、「確実なものだけ」では日付を入れない。入力した日数は、次回の目安に使う", async () => {
			const user = userEvent.setup();
			const registerInventoryItem = vi.fn().mockResolvedValue({});

			render(
				<Harness
					registerInventoryItem={registerInventoryItem}
					onRegistered={() => {}}
				/>,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "鶏もも肉");

			expect(screen.getByLabelText("期限")).toHaveValue("");
			expect(screen.getByLabelText("期限の種類")).toHaveValue("use-by");

			// 買ってから3日後の期限を入力して、登録する
			await user.click(
				screen.getByRole("button", { name: "期限を+3日にする" }),
			);
			await user.click(screen.getByRole("button", { name: "在庫に追加" }));
			await waitFor(() => expect(registerInventoryItem).toHaveBeenCalled());

			// もう一度、同じ食材：覚えた3日で、目安が入る
			await user.type(screen.getByLabelText("食材名"), "鶏もも肉");

			await waitFor(() =>
				expect(screen.getByLabelText("期限")).toHaveValue(addDays(today, 3)),
			);
			expect(screen.getByText(/目安の日付（約）です/u)).toBeInTheDocument();
		});

		it("ユーザーが期限の欄を触ったら、食材名を変えても、上書きしない", async () => {
			const user = userEvent.setup();

			render(
				<Harness registerInventoryItem={vi.fn()} onRegistered={() => {}} />,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "冷凍ブロッコリー");
			await user.click(
				screen.getByRole("button", { name: "期限を明日にする" }),
			);
			await user.clear(screen.getByLabelText("食材名"));
			await user.type(screen.getByLabelText("食材名"), "冷凍コーン");

			expect(screen.getByLabelText("期限")).toHaveValue(addDays(today, 1));
		});

		it("ユーザーが決めた期限の種類を、初期値にする", async () => {
			const user = userEvent.setup();

			render(
				<Harness
					registerInventoryItem={vi.fn()}
					onRegistered={() => {}}
					lookupIngredientDefaults={() => ({
						expiryKind: "best-before",
						storage: null,
					})}
				/>,
			);
			await userEvent
				.setup()
				.click(screen.getByRole("button", { name: /期限・保存方法/u }));

			await user.type(screen.getByLabelText("食材名"), "鶏もも肉");

			expect(screen.getByLabelText("期限の種類")).toHaveValue("best-before");
		});
	});
});
