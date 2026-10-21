// デモ用のアカウント（src/integrations/demo-login）のデータを、DB に入れる。
// 使い方（開発用 DB）:
//   nlx tsx --env-file=.env.local scripts/seed-demo-account.ts --confirm
// 本番に入れるときは、DATABASE_URL（neondb_owner の直接接続）と DEMO_LOGIN_EMAIL を、環境変数で渡す（運営者が実行する）:
//   DATABASE_URL='...' DEMO_LOGIN_EMAIL='demo-xxxx@recipion.app' nlx tsx scripts/seed-demo-account.ts --confirm
//
// - `--confirm` がないと、接続先と、入れる内容の要約を表示するだけで、何も書かない。
// - 何度でも実行できる。同じメールアドレスのユーザーが既にあれば、そのユーザー（と、連鎖で消える全データ）を消して、入れ直す。
// - DEMO_LOGIN_EMAIL が未指定なら、ランダムなアドレスを作って表示する（同じ値を、シークレット DEMO_LOGIN_EMAIL にも設定する）。
// - 買い物メモは、ブラウザの中（IndexedDB）にだけあるので、ここでは入れない。
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Client } from "pg";
import { prepareRecipeForStorage } from "../src/features/recipes/application/prepare-recipe-for-storage.ts";
import { createRecipeEditorDocument } from "../src/features/recipes/domain/recipe-editor-document.ts";
import { createDrizzleRecipeRepository } from "../src/features/recipes/infrastructure/drizzle-recipe-repository.ts";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "../src/features/ingredients/domain/ingredient-catalog.ts";
import { registerInventoryItem } from "../src/features/inventory/application/register-inventory-item.ts";
import { createDrizzleInventoryRepository } from "../src/features/inventory/infrastructure/drizzle-inventory-repository.ts";
import * as schema from "../src/db/schema.ts";
import { user } from "../src/integrations/better-auth/auth.sql.ts";

const DISPLAY_NAME = "確認用アカウント";

type Recipe = {
	name: string;
	servings: number;
	ingredientText: string;
	preparationText: string;
	instructionText: string;
	note: string;
};

const recipes: readonly Recipe[] = [
	{
		name: "豚の生姜焼き",
		servings: 2,
		ingredientText: `豚ロース肉 200g
玉ねぎ 1/2個
キャベツ 2枚
A 醤油 大さじ1と1/2
A みりん 大さじ1
A 酒 大さじ1
A おろししょうが 小さじ1
サラダ油 小さじ1`,
		preparationText: `- 玉ねぎを薄切りにする
- Aを混ぜ合わせておく`,
		instructionText: `1. フライパンに油を熱し、豚肉を広げて焼く
2. 玉ねぎを加えて炒める
3. Aを回し入れて、全体にからめる
4. 千切りのキャベツと一緒に盛りつける`,
		note: "漬け込まずに、たれをからめるだけでも十分おいしくできます。",
	},
	{
		name: "肉じゃが",
		servings: 3,
		ingredientText: `じゃがいも 3個
にんじん 1本
玉ねぎ 1個
豚バラ肉 150g
A だし汁 300ml
A 醤油 大さじ2
A 砂糖 大さじ2
A みりん 大さじ2
サラダ油 大さじ1`,
		preparationText: `- じゃがいもと人参を乱切りにする
- 玉ねぎをくし切りにする`,
		instructionText: `1. 鍋に油を熱し、豚肉を炒める
2. 野菜を加えて、油がなじむまで炒める
3. Aを加え、落とし蓋をして15分ほど煮る
4. 火を止めて、そのまま冷まして味をしみこませる`,
		note: "一度冷ますと、味がしみておいしくなります。",
	},
	{
		name: "親子丼",
		servings: 2,
		ingredientText: `鶏もも肉 1枚
玉ねぎ 1/2個
卵 3個
ご飯 2杯
A だし汁 150ml
A 醤油 大さじ2
A みりん 大さじ2
A 砂糖 小さじ2
三つ葉 適量`,
		preparationText: `- 鶏肉を一口大に切る
- 玉ねぎを薄切りにする
- 卵を溶きほぐす`,
		instructionText: `1. 鍋にAを入れて煮立て、鶏肉と玉ねぎを加えて煮る
2. 鶏肉に火が通ったら、溶き卵の半分を回し入れる
3. 蓋をして30秒ほど待ち、残りの卵を加えて火を止める
4. ご飯にのせて、三つ葉を散らす`,
		note: "卵は2回に分けて入れると、とろっと仕上がります。",
	},
	{
		name: "豆腐とわかめの味噌汁",
		servings: 2,
		ingredientText: `木綿豆腐 1/2丁
乾燥わかめ 小さじ2
長ねぎ 1/3本
だし汁 400ml
味噌 大さじ2`,
		preparationText: `- 豆腐を1.5cm角に切る
- ねぎを小口切りにする`,
		instructionText: `1. 鍋にだし汁を入れて温める
2. 豆腐とわかめを加えてひと煮立ちさせる
3. 火を弱めて味噌を溶き入れる
4. ねぎを加えて火を止める`,
		note: "味噌を入れたあとは、煮立てないのがコツです。",
	},
	{
		name: "ほうれん草のおひたし",
		servings: 2,
		ingredientText: `ほうれん草 1束
A だし汁 大さじ3
A 醤油 小さじ2
かつお節 ひとつまみ`,
		preparationText: `- ほうれん草の根元を洗う`,
		instructionText: `1. 沸騰した湯で、ほうれん草を1分ほどゆでる
2. 冷水にとって冷まし、水気をしぼる
3. 4cmほどの長さに切る
4. Aを合わせたたれをかけて、かつお節をのせる`,
		note: "水気をよくしぼると、味がぼやけません。",
	},
];

type InventoryEntry = {
	name: string;
	quantity: number;
	storage: "room" | "fridge" | "freezer";
	// 今日から何日後の期限か。null は期限なし。
	expiresInDays: number | null;
	expiryKind: "use-by" | "best-before" | "none";
	// 「ある」で登録する（量を追わない食材）。
	available?: boolean;
};

// 冷蔵庫の画面が見栄えよくなるよう、期限が近いものも混ぜる。
const inventory: readonly InventoryEntry[] = [
	{ name: "鶏もも肉", quantity: 300, storage: "fridge", expiresInDays: 1, expiryKind: "use-by" },
	{ name: "牛乳", quantity: 1000, storage: "fridge", expiresInDays: 2, expiryKind: "use-by" },
	{ name: "木綿豆腐", quantity: 2, storage: "fridge", expiresInDays: 3, expiryKind: "use-by" },
	{ name: "卵", quantity: 10, storage: "fridge", expiresInDays: 12, expiryKind: "best-before" },
	{ name: "ヨーグルト", quantity: 400, storage: "fridge", expiresInDays: 6, expiryKind: "best-before" },
	{ name: "バター", quantity: 200, storage: "fridge", expiresInDays: 45, expiryKind: "best-before" },
	{ name: "キャベツ", quantity: 800, storage: "fridge", expiresInDays: 8, expiryKind: "use-by" },
	{ name: "玉ねぎ", quantity: 3, storage: "room", expiresInDays: null, expiryKind: "none" },
	{ name: "じゃがいも", quantity: 4, storage: "room", expiresInDays: null, expiryKind: "none" },
	{ name: "にんじん", quantity: 2, storage: "fridge", expiresInDays: 14, expiryKind: "use-by" },
	{ name: "冷凍ブロッコリー", quantity: 250, storage: "freezer", expiresInDays: 60, expiryKind: "best-before" },
	{ name: "醤油", quantity: 1, storage: "room", expiresInDays: null, expiryKind: "none", available: true },
	{ name: "塩", quantity: 1, storage: "room", expiresInDays: null, expiryKind: "none", available: true },
	{ name: "オリーブオイル", quantity: 1, storage: "room", expiresInDays: null, expiryKind: "none", available: true },
];

// 日本時間の今日から days 日後の日付（YYYY-MM-DD）。
function jstDate(daysFromToday: number): string {
	const base = new Date(
		new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
	);

	base.setDate(base.getDate() + daysFromToday);

	return [
		base.getFullYear(),
		String(base.getMonth() + 1).padStart(2, "0"),
		String(base.getDate()).padStart(2, "0"),
	].join("-");
}

function randomLowercase(length: number): string {
	const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
	const bytes = randomBytes(length);

	return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL を指定してください");
}

const email = (
	process.env.DEMO_LOGIN_EMAIL?.trim() ||
	`demo-${randomLowercase(10)}@recipion.app`
).toLowerCase();
const isConfirmed = process.argv.includes("--confirm");

console.log(`接続先のホスト: ${new URL(connectionString).host}`);
console.log(`確認用のメールアドレス: ${email}`);
console.log(
	`入れるもの: レシピ ${recipes.length} 件（すべて非公開）、在庫 ${inventory.length} 件`,
);

if (!isConfirmed) {
	console.log("--confirm がないので、何も書きません。");
	process.exit(0);
}

const client = new Client({ connectionString });

await client.connect();

const db = drizzle(client, { schema });

try {
	// 同じアドレスのユーザーが既にあれば、消す（レシピ・在庫などは、外部キーの連鎖で消える）。
	await db.delete(user).where(eq(user.email, email));

	const userId = crypto.randomUUID();

	await db.insert(user).values({
		id: userId,
		name: DISPLAY_NAME,
		email,
		emailVerified: true,
		handle: `demo-${randomLowercase(6)}`,
	});

	const recipeRepository = createDrizzleRecipeRepository(db, userId);

	for (const recipe of recipes) {
		const document = createRecipeEditorDocument({
			...recipe,
			visibility: "private",
		});

		await recipeRepository.create(prepareRecipeForStorage(document));
	}

	const inventoryRepository = createDrizzleInventoryRepository(db, userId);

	for (const entry of inventory) {
		const catalogEntry = findIngredientCatalogEntry(entry.name);

		if (!catalogEntry) {
			throw new Error(`カタログにない食材です: ${entry.name}`);
		}

		await registerInventoryItem(
			{
				transactionId: crypto.randomUUID(),
				ingredientName: catalogEntry.name,
				stockUnitCode: catalogEntry.stockUnitCode,
				stockUnitLabel: getDefaultStockUnitLabel(catalogEntry.stockUnitCode),
				trackingMode: catalogEntry.defaultTrackingMode,
				initialQuantity: entry.available ? 0 : entry.quantity,
				markAsAvailable: entry.available ?? false,
				lot: {
					acquiredOn: jstDate(0),
					storage: entry.storage,
					expiresOn:
						entry.expiresInDays === null ? null : jstDate(entry.expiresInDays),
					expiryKind: entry.expiryKind,
					expirySource: entry.expiresInDays === null ? null : "entered",
				},
			},
			{
				inventoryItemResolver: inventoryRepository,
				inventoryAdjustmentRepository: inventoryRepository,
				inventoryTrackingModeRepository: inventoryRepository,
			},
		);
	}

	console.log("入れました。");
	console.log(
		"本番では、同じメールアドレスと、6桁のコードを、シークレット DEMO_LOGIN_EMAIL・DEMO_LOGIN_CODE に設定すると、ログインできます。",
	);
	console.log("不要になったら、2つのシークレットを削除してください。");
} finally {
	await client.end();
}
