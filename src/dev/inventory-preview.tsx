import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { InventoryList } from "#/features/inventory/components/inventory-list";
import {
	addDays,
	type InventoryLot,
	toDateString,
} from "#/features/inventory/domain/inventory-lot";

// 開発中だけの、在庫の画面の確認用（/dev/inventory）。ログインなしで、見た目と操作を試せる。
// データは、このページの中だけの見本。通信はしない。
const today = toDateString(new Date());

let lotSeq = 0;

function lot(
	overrides: Partial<InventoryLot> & { quantity: number },
): InventoryLot {
	lotSeq += 1;

	return {
		id: `00000000-0000-4000-8000-${String(lotSeq).padStart(12, "0")}`,
		acquiredOn: addDays(today, -3),
		storage: "fridge",
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
		...overrides,
	};
}

function item(
	name: string,
	lots: InventoryLot[],
	overrides: Partial<InventoryListItem> = {},
): InventoryListItem {
	lotSeq += 1;

	return {
		inventoryItemId: `10000000-0000-4000-8000-${String(lotSeq).padStart(12, "0")}`,
		ingredientId: `20000000-0000-4000-8000-${String(lotSeq).padStart(12, "0")}`,
		name,
		displayName: null,
		quantity: lots.reduce((sum, current) => sum + current.quantity, 0),
		lots,
		stockUnitCode: "count",
		stockUnitLabel: "個",
		trackingMode: "exact",
		defaultExpiryKind: null,
		defaultStorage: null,
		updatedAt: "2026-10-01T00:00:00.000Z",
		...overrides,
	};
}

function buildSample(): InventoryListItem[] {
	const grams = { stockUnitCode: "g", stockUnitLabel: "g" } as const;
	const ml = { stockUnitCode: "ml", stockUnitLabel: "ml" } as const;

	return [
		item("卵", [lot({ quantity: 6, expiresOn: addDays(today, 12) })]),
		item(
			"鶏むね肉",
			[
				lot({
					quantity: 300,
					expiresOn: addDays(today, 1),
					expiryKind: "use-by",
				}),
			],
			grams,
		),
		item(
			"牛乳",
			[
				lot({
					quantity: 500,
					expiresOn: addDays(today, 3),
					expiryKind: "use-by",
				}),
				lot({
					quantity: 300,
					expiresOn: addDays(today, 8),
					expiryKind: "use-by",
				}),
			],
			{ ...ml, trackingMode: "estimated" },
		),
		item(
			"豆腐",
			[
				lot({
					quantity: 1,
					expiresOn: addDays(today, -1),
					expiryKind: "best-before",
					expirySource: "estimated",
				}),
			],
			{ stockUnitLabel: "丁" },
		),
		item("玉ねぎ", [lot({ quantity: 2.5, storage: "room" })], {
			stockUnitLabel: "玉",
		}),
		item("にんじん", [lot({ quantity: 3 })], { stockUnitLabel: "本" }),
		item("ほうれん草", [lot({ quantity: 1, expiresOn: addDays(today, 2) })], {
			stockUnitLabel: "株",
		}),
		item("冷凍ご飯", [lot({ quantity: 6, storage: "freezer" })], {
			stockUnitLabel: "食分",
		}),
		item("冷凍ほうれん草", [lot({ quantity: 400, storage: "freezer" })], grams),
		item("醤油", [lot({ quantity: 1 })], { trackingMode: "presence" }),
		item("みりん", [lot({ quantity: 1 })], { trackingMode: "presence" }),
		item("砂糖", [lot({ quantity: 0 })], { trackingMode: "presence" }),
		item("薄力粉", [lot({ quantity: 600, storage: "room" })], grams),
		item("じゃがいも", [], { stockUnitLabel: "個" }),
	];
}

const sample = buildSample();

export function InventoryPreview() {
	return (
		<div style={{ maxWidth: 1384, margin: "0 auto", padding: 16 }}>
			<InventoryList
				ownerScope="user:dev"
				loadInventoryItems={async () => ({
					items: sample,
					source: "network",
					cachedAt: new Date().toISOString(),
				})}
				adjustInventoryItem={async (command) => {
					const target = sample.find(
						(candidate) =>
							candidate.inventoryItemId === command.inventoryItemId,
					);
					const delta =
						(command.operation === "increase" ? 1 : -1) * command.inputQuantity;
					const lots = (target?.lots ?? []).map((current, index) =>
						index === 0
							? { ...current, quantity: Math.max(0, current.quantity + delta) }
							: current,
					);

					return {
						status: "applied",
						transactionId: crypto.randomUUID(),
						quantity: lots.reduce((sum, current) => sum + current.quantity, 0),
						lots,
					};
				}}
				updateInventoryLot={async () => {
					throw new Error("見本のため、保存できません");
				}}
				setLotQuantity={async () => {
					throw new Error("見本のため、保存できません");
				}}
				changeStockUnit={async () => {
					throw new Error("見本のため、保存できません");
				}}
				changeTrackingMode={async () => {
					throw new Error("見本のため、保存できません");
				}}
				renameInventoryItem={async (command) => ({
					inventoryItemId: command.inventoryItemId,
					displayName: command.displayName,
				})}
				deleteInventoryItem={async () => true}
			/>
		</div>
	);
}
