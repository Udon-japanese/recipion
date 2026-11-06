-- 材料の名前の照合で、ひらがなとカタカナの違いをそろえる（normalizeIngredientName の foldKatakanaToHiragana と同じ範囲：ァ〜ヶ → ぁ〜ゖ）。
-- 適用の前に、同じ人の別々の材料が、そろえると同じ名前になる組み合わせがないことを確かめる（あると、2つ目の UPDATE が一意の制約で失敗し、全体が取り消される）：
--   SELECT user_id, translate(normalized_name, 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ') AS folded_name, array_agg(name) AS names
--   FROM ingredient_alias
--   GROUP BY 1, 2
--   HAVING count(DISTINCT ingredient_id) > 1;

-- 同じ材料の呼び名で、そろえると同じになるもの（「たまご」と「タマゴ」など）は、1つだけ残す（代表の名前を優先し、なければ古いもの）。
DELETE FROM "ingredient_alias" AS "alias"
USING (
	SELECT
		"id",
		row_number() OVER (
			PARTITION BY "ingredient_id", translate("normalized_name", 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ')
			ORDER BY "is_primary" DESC, "created_at", "id"
		) AS "rank"
	FROM "ingredient_alias"
) AS "ranked"
WHERE "alias"."id" = "ranked"."id" AND "ranked"."rank" > 1;
--> statement-breakpoint
UPDATE "ingredient_alias"
SET "normalized_name" = translate("normalized_name", 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ')
WHERE "normalized_name" <> translate("normalized_name", 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ', 'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ');
