import { withOwner } from "#/features/shopping/infrastructure/owned-shopping-records";

// テストで、買い物メモの表に直接入れる行を、ゲストのものにする。
export function asGuest<T>(row: T) {
	return withOwner(row, "guest");
}
