import { describe, expect, it, vi } from "vitest";
import {
	parseRegisterInventoryItemInput,
	registerInventoryItem,
} from "./register-inventory-item";

const transactionId = "3f1c9a5e-7b1d-4c3e-9a41-2d6f8b0e1a11";

type StockUnit = {
	stockUnitCode: "count" | "g" | "ml";
	stockUnitLabel: string;
};

// existingUnit：すでに在庫にある食材の単位（省略は、登録で頼んだ単位のまま）。
function createDependencies(
	currentQuantity = 0,
	currentMode: "exact" | "estimated" | "presence" = "estimated",
	existingUnit?: StockUnit,
) {
	const resolveOrCreateInventoryItem = vi.fn(async (command: StockUnit) => ({
		ingredientId: "ingredient-1",
		inventoryItemId: "inventory-item-1",
		name: "塩",
		stockUnitCode: existingUnit?.stockUnitCode ?? command.stockUnitCode,
		stockUnitLabel: existingUnit?.stockUnitLabel ?? command.stockUnitLabel,
		trackingMode: currentMode,
		quantity: currentQuantity,
	}));
	const applyAdjustment = vi.fn(async () => ({
		status: "applied" as const,
		transactionId,
		quantity: 500,
		lots: [],
	}));
	const changeTrackingMode = vi.fn(async () => ({
		inventoryItemId: "inventory-item-1",
		trackingMode: "presence" as const,
		quantity: 0,
		lots: [],
	}));

	return {
		resolveOrCreateInventoryItem,
		applyAdjustment,
		changeTrackingMode,
		dependencies: {
			inventoryItemResolver: { resolveOrCreateInventoryItem },
			inventoryAdjustmentRepository: { applyAdjustment },
			inventoryTrackingModeRepository: { changeTrackingMode },
		},
	};
}

describe("registerInventoryItem", () => {
	it("食材を登録し、初期数量を手動の追加として記録する", async () => {
		const { dependencies, resolveOrCreateInventoryItem, applyAdjustment } =
			createDependencies();

		const result = await registerInventoryItem(
			parseRegisterInventoryItemInput({
				transactionId,
				ingredientName: " 塩 ",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				initialQuantity: 500,
			}),
			dependencies,
		);

		expect(resolveOrCreateInventoryItem).toHaveBeenCalledWith({
			ingredientName: "塩",
			stockUnitCode: "g",
			stockUnitLabel: "g",
			trackingMode: "estimated",
		});
		expect(applyAdjustment).toHaveBeenCalledWith({
			transactionId,
			inventoryItemId: "inventory-item-1",
			inputQuantity: 500,
			inputUnitCode: "g",
			stockQuantityPerInputUnit: 1,
			operation: "increase",
			reason: "manual-adjustment",
		});
		expect(result.adjustment?.quantity).toBe(500);
	});

	it("初期数量が0なら、食材だけを登録し、数量は動かさない", async () => {
		const { dependencies, applyAdjustment } = createDependencies();

		const result = await registerInventoryItem(
			parseRegisterInventoryItemInput({
				transactionId,
				ingredientName: "塩",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				initialQuantity: 0,
			}),
			dependencies,
		);

		expect(applyAdjustment).not.toHaveBeenCalled();
		expect(result.adjustment).toBeNull();
	});
});

describe("registerInventoryItem（「ある」）", () => {
	const input = parseRegisterInventoryItemInput({
		transactionId,
		ingredientName: "塩",
		stockUnitCode: "g",
		stockUnitLabel: "g",
		initialQuantity: 0,
		markAsAvailable: true,
	});

	it("有無だけで登録し、量を入れずに「ある」にする（目印の数量ではなく、ロットを1つ足す）", async () => {
		const { dependencies, applyAdjustment, resolveOrCreateInventoryItem } =
			createDependencies(0, "presence");

		await registerInventoryItem(input, dependencies);

		expect(resolveOrCreateInventoryItem).toHaveBeenCalledWith(
			expect.objectContaining({ trackingMode: "presence" }),
		);
		expect(applyAdjustment).toHaveBeenCalledWith(
			expect.objectContaining({
				inputQuantity: 1,
				operation: "increase",
				reason: "manual-adjustment",
			}),
		);
	});

	it("すでに在庫があれば（ある、または量を追っている）、何もしない", async () => {
		for (const mode of ["presence", "estimated"] as const) {
			const { dependencies, applyAdjustment, changeTrackingMode } =
				createDependencies(300, mode);

			const result = await registerInventoryItem(input, dependencies);

			expect(applyAdjustment).not.toHaveBeenCalled();
			expect(changeTrackingMode).not.toHaveBeenCalled();
			expect(result.adjustment).toBeNull();
		}
	});

	it("在庫が0の、量を追う食材は、有無だけに切り替えてから、「ある」にする", async () => {
		const { dependencies, applyAdjustment, changeTrackingMode } =
			createDependencies(0, "estimated");

		const result = await registerInventoryItem(input, dependencies);

		expect(changeTrackingMode).toHaveBeenCalledWith({
			inventoryItemId: "inventory-item-1",
			trackingMode: "presence",
		});
		expect(applyAdjustment).toHaveBeenCalledTimes(1);
		expect(result.inventoryItem.trackingMode).toBe("presence");
	});
});

describe("parseRegisterInventoryItemInput", () => {
	const valid = {
		transactionId,
		ingredientName: "塩",
		stockUnitCode: "g",
		stockUnitLabel: "g",
		initialQuantity: 1,
	};

	it("不正な入力を拒否する", () => {
		expect(() =>
			parseRegisterInventoryItemInput({ ...valid, ingredientName: "  " }),
		).toThrow();
		expect(() =>
			parseRegisterInventoryItemInput({ ...valid, initialQuantity: -1 }),
		).toThrow();
		expect(() =>
			parseRegisterInventoryItemInput({ ...valid, stockUnitCode: "kg" }),
		).toThrow();
		expect(() =>
			parseRegisterInventoryItemInput({ ...valid, transactionId: "x" }),
		).toThrow();
	});

	// 在庫にある食材の単位と違う単位で打った数を、その単位の数として足さない（6枚が6袋にならない）。
	it.each([
		{ existing: "袋", chosen: "枚", rejects: true },
		{ existing: "g", chosen: "個", rejects: true },
		{ existing: "袋", chosen: "袋", rejects: false },
	])(
		"在庫が「$existing」の食材に「$chosen」で6を入れると、断る：$rejects",
		async ({ existing, chosen, rejects }) => {
			const toUnit = (label: string): StockUnit => ({
				stockUnitCode: label === "g" ? "g" : "count",
				stockUnitLabel: label,
			});
			const { dependencies, applyAdjustment } = createDependencies(
				6,
				"estimated",
				toUnit(existing),
			);
			const register = registerInventoryItem(
				parseRegisterInventoryItemInput({
					transactionId,
					ingredientName: "米粉パン",
					...toUnit(chosen),
					initialQuantity: 6,
				}),
				dependencies,
			);

			if (rejects) {
				await expect(register).rejects.toThrow(`在庫の単位が${existing}です`);
				expect(applyAdjustment).not.toHaveBeenCalled();
			} else {
				await register;
				expect(applyAdjustment).toHaveBeenCalled();
			}
		},
	);

	it("「ある」で登録するときは、単位を比べない（量を使わない）", async () => {
		const { dependencies, applyAdjustment } = createDependencies(
			0,
			"presence",
			{ stockUnitCode: "ml", stockUnitLabel: "ml" },
		);

		await registerInventoryItem(
			parseRegisterInventoryItemInput({
				transactionId,
				ingredientName: "塩",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				initialQuantity: 0,
				markAsAvailable: true,
			}),
			dependencies,
		);

		expect(applyAdjustment).toHaveBeenCalled();
	});

	it("ロットの換算（1個＝110g）は、そのまま初期数量のロットに渡す", async () => {
		const { dependencies, applyAdjustment } = createDependencies();
		const input = parseRegisterInventoryItemInput({
			transactionId,
			ingredientName: "冷凍うどん",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			initialQuantity: 6,
			lot: {
				purchaseUnit: { label: "個", quantity: 110, quantityUnitLabel: "g" },
			},
		});

		await registerInventoryItem(input, dependencies);

		expect(applyAdjustment).toHaveBeenCalledWith(
			expect.objectContaining({
				lot: {
					purchaseUnit: { label: "個", quantity: 110, quantityUnitLabel: "g" },
				},
			}),
		);
	});

	it("換算の量が0以下・単位が空なら、入力として受け付けない", () => {
		for (const purchaseUnit of [
			{ label: "個", quantity: 0, quantityUnitLabel: "g" },
			{ label: "個", quantity: 110, quantityUnitLabel: " " },
		]) {
			expect(() =>
				parseRegisterInventoryItemInput({
					transactionId,
					ingredientName: "冷凍うどん",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					initialQuantity: 6,
					lot: { purchaseUnit },
				}),
			).toThrow();
		}
	});
});
