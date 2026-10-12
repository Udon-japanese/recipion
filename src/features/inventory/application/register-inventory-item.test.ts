import { describe, expect, it, vi } from "vitest";
import {
	parseRegisterInventoryItemInput,
	registerInventoryItem,
} from "./register-inventory-item";

const transactionId = "3f1c9a5e-7b1d-4c3e-9a41-2d6f8b0e1a11";

function createDependencies(
	currentQuantity = 0,
	currentMode: "exact" | "estimated" | "presence" = "estimated",
) {
	const resolveOrCreateInventoryItem = vi.fn(async () => ({
		ingredientId: "ingredient-1",
		inventoryItemId: "inventory-item-1",
		name: "塩",
		stockUnitCode: "g" as const,
		stockUnitLabel: "g",
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
});
