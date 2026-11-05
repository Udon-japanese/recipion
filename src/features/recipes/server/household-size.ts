import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { user } from "#/integrations/better-auth/auth.sql";
import { requireSession } from "#/integrations/better-auth/require-session";
import { maxHouseholdSize, minHouseholdSize } from "../domain/household-size";

// 本人のうちの人数（設定していなければ null）。
export const getHouseholdSizeServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db, userId } = await requireSession();
	const [row] = await db
		.select({ householdSize: user.householdSize })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	return row?.householdSize ?? null;
});

// 本人のうちの人数を保存する（null は、設定しない）。本人だけが使う値なので、審査の対象にしない。
export const updateHouseholdSizeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		v.parse(
			v.object({
				householdSize: v.nullable(
					v.pipe(
						v.number(),
						v.integer(),
						v.minValue(minHouseholdSize),
						v.maxValue(maxHouseholdSize),
					),
				),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await db
			.update(user)
			.set({ householdSize: data.householdSize })
			.where(eq(user.id, userId));

		return data.householdSize;
	});
