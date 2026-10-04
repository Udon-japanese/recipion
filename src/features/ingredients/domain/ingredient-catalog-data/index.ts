import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { dairyAndEggsEntries } from "./dairy-and-eggs";
import { driedGoodsEntries } from "./dried-goods";
import { meatAndSeafoodEntries } from "./meat-and-seafood";
import { powdersAndSpicesEntries } from "./powders-and-spices";
import { seasoningsEntries } from "./seasonings";
import { soyAndProcessedEntries } from "./soy-and-processed";
import { staplesEntries } from "./staples";
import { vegetablesEntries } from "./vegetables";

// 食材のカタログのデータ。全食材は網羅せず、よく使う定番と、登録したレシピに出る食材だけを入れる。
// 食材の種類ごとにファイルを分けている。食材を足すときは、その種類のファイルに足す。
// 細分化した食材（薄口醤油、赤味噌など）は、別の食材として持ち、総称（醤油、味噌など）と同じファイルに置く。
//
// 出典（2026-10 に確認）：
// - 大さじ・小さじの重さ：白ごはん.com、エスビー食品「調味料の目安重量」、イチビキ「分量の早見表」、
//   japanese-food.net（生クリーム）、味の素「ほんだし」の計量表（小さじ1＝約3g）
//   （大さじ1＝15ml、小さじ1＝5ml。重さ ÷ 体積 で密度を出した）
// - 個数ごとの重さ：味の素パーク「食材の目安量」、キッコーマン「分量のめやす」、古賀市「食材・調味料の量・重さ」、
//   デリッシュキッチン「食材の目安量」、各食材の重さを調べたサイト（生活の中のなぜ、weight-g.com など）
// - 一部の乾物・ルー・肉・缶詰・麺・野菜：ユーザー提供の換算表（2026-10-04）
//
// `approximate: true` は、出典によって値が違う、個体差・商品差が大きい、または確かな出典を確認できていない値。
// 計算に使うが、画面では「約」と示す前提にする。出典を確認できなかったものは、コメントで「出典未確認」と書いている
// （密度・重さを入れず、省いたものもある）。
export const ingredientCatalogEntries: readonly IngredientCatalogEntry[] = [
	...dairyAndEggsEntries,
	...soyAndProcessedEntries,
	...meatAndSeafoodEntries,
	...vegetablesEntries,
	...staplesEntries,
	...driedGoodsEntries,
	...powdersAndSpicesEntries,
	...seasoningsEntries,
];
