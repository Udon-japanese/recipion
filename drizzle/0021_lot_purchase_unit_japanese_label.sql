-- 以前のカタログのプリセットで買ったロットは、買った単位の呼び名が英語のコード（pack・bag など）で保存されている。日本語の呼び名に直す。
-- 対応は inventory-lot.ts の legacyPresetUnitLabels と同じ（房・ボトルなど、元の呼び名は分からないので、いちばん多い呼び名にする）。
UPDATE "inventory_lot"
SET
	"purchase_unit_label" = CASE "purchase_unit_label"
		WHEN 'pack' THEN 'パック'
		WHEN 'bag' THEN '袋'
		WHEN 'bottle' THEN 'ボトル'
		WHEN 'box' THEN '箱'
		WHEN 'can' THEN '缶'
	END,
	"updated_at" = now()
WHERE "purchase_unit_label" IN ('pack', 'bag', 'bottle', 'box', 'can');
