import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as v from "valibot";

import type { DB } from "#/db/client";

import type {
	CreateRecipeCommand,
	RecipeRepository,
} from "../application/recipe-repository";
import { restoreRecipeIngredients } from "../application/restore-recipe-ingredients";
import {
	formatRecipeIngredientQuantity,
	formatRecipeServings,
} from "./format-recipe-storage-number";
import {
	recipe,
	recipeIngredientNode,
	recipeInstruction,
	recipePreparation,
} from "./recipe.sql";

const uuidSchema = v.pipe(v.string(), v.uuid());

function validateIds(command: CreateRecipeCommand): void {
	for (const node of command.ingredients) {
		v.parse(uuidSchema, node.id);

		if (node.parentId !== null) {
			v.parse(uuidSchema, node.parentId);
		}
	}

	for (const preparation of command.preparations) {
		v.parse(uuidSchema, preparation.id);
	}

	for (const instruction of command.instructions) {
		v.parse(uuidSchema, instruction.id);

		for (const referencedId of instruction.referencedInstructionIds) {
			v.parse(uuidSchema, referencedId);
		}
	}
}

type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

async function insertRecipeChildren(
	transaction: Transaction,
	userId: string,
	recipeId: string,
	command: CreateRecipeCommand,
): Promise<void> {
	// 親グループが先に並ぶため、材料は順番に保存する。
	for (const node of command.ingredients) {
		await transaction.insert(recipeIngredientNode).values({
			id: node.id,
			recipeId,
			userId,
			parentId: node.parentId,
			sortOrder: node.sortOrder,
			type: node.type,
			name: node.name,
			rawText: node.rawText,
			inferred: node.inferred,
			status: node.status,
			amountText: node.amountText,
			quantity:
				node.quantity === null
					? null
					: formatRecipeIngredientQuantity(node.quantity),
			unitLabel: node.unitLabel,
		});
	}

	if (command.preparations.length > 0) {
		await transaction.insert(recipePreparation).values(
			command.preparations.map((item) => ({
				id: item.id,
				recipeId,
				userId,
				sortOrder: item.sortOrder,
				text: item.text,
			})),
		);
	}

	if (command.instructions.length > 0) {
		await transaction.insert(recipeInstruction).values(
			command.instructions.map((item) => ({
				id: item.id,
				recipeId,
				userId,
				sortOrder: item.sortOrder,
				text: item.text,
				referencedInstructionIds: item.referencedInstructionIds,
			})),
		);
	}
}

export function createDrizzleRecipeRepository(
	db: DB,
	userId: string,
	createPublicId: () => string = () => nanoid(),
): RecipeRepository {
	if (userId.trim().length === 0) {
		throw new Error("ユーザーIDを指定してください");
	}

	return {
		async create(command) {
			validateIds(command);

			return db.transaction(async (transaction) => {
				const [createdRecipe] = await transaction
					.insert(recipe)
					.values({
						userId,
						publicId: createPublicId(),
						name: command.name,
						servings: formatRecipeServings(command.servings),
						note: command.note,
						sourceUrl: command.sourceUrl,
					})
					.returning({ id: recipe.id, publicId: recipe.publicId });

				if (!createdRecipe) {
					throw new Error("レシピを作成できませんでした");
				}

				await insertRecipeChildren(
					transaction,
					userId,
					createdRecipe.id,
					command,
				);

				return { id: createdRecipe.id, publicId: createdRecipe.publicId };
			});
		},

		async update(publicId, command) {
			validateIds(command);

			return db.transaction(async (transaction) => {
				const [existing] = await transaction
					.select({ id: recipe.id })
					.from(recipe)
					.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

				if (!existing) return null;

				await transaction
					.update(recipe)
					.set({
						name: command.name,
						servings: formatRecipeServings(command.servings),
						note: command.note,
						sourceUrl: command.sourceUrl,
					})
					.where(eq(recipe.id, existing.id));

				// 材料・下準備・作り方は、すべて入れ替える（同じ ID で入れ直せる）。
				await transaction
					.delete(recipeIngredientNode)
					.where(eq(recipeIngredientNode.recipeId, existing.id));
				await transaction
					.delete(recipePreparation)
					.where(eq(recipePreparation.recipeId, existing.id));
				await transaction
					.delete(recipeInstruction)
					.where(eq(recipeInstruction.recipeId, existing.id));

				await insertRecipeChildren(transaction, userId, existing.id, command);

				return { publicId };
			});
		},

		async delete(publicId) {
			// 材料・下準備・作り方は、外部キーの CASCADE で一緒に消える。
			const deleted = await db
				.delete(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)))
				.returning({ id: recipe.id });

			return deleted.length > 0;
		},

		async getByPublicId(publicId) {
			const [found] = await db
				.select()
				.from(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)));

			if (!found) return null;

			const [ingredientRows, preparationRows, instructionRows] =
				await Promise.all([
					db
						.select()
						.from(recipeIngredientNode)
						.where(eq(recipeIngredientNode.recipeId, found.id)),
					db
						.select()
						.from(recipePreparation)
						.where(eq(recipePreparation.recipeId, found.id))
						.orderBy(asc(recipePreparation.sortOrder)),
					db
						.select()
						.from(recipeInstruction)
						.where(eq(recipeInstruction.recipeId, found.id))
						.orderBy(asc(recipeInstruction.sortOrder)),
				]);

			return {
				publicId: found.publicId,
				name: found.name,
				servings: Number(found.servings),
				note: found.note,
				sourceUrl: found.sourceUrl,
				ingredients: restoreRecipeIngredients(
					ingredientRows.map((row) => ({
						id: row.id,
						parentId: row.parentId,
						sortOrder: row.sortOrder,
						type: row.type === "group" ? "group" : "ingredient",
						name: row.name,
						rawText: row.rawText,
						inferred: row.inferred,
						status:
							row.status === "parsed" || row.status === "missing-amount"
								? row.status
								: null,
						amountText: row.amountText,
						quantity: row.quantity === null ? null : Number(row.quantity),
						unitLabel: row.unitLabel,
					})),
				),
				preparations: preparationRows.map((row) => ({
					id: row.id,
					text: row.text,
				})),
				instructions: instructionRows.map((row) => ({
					id: row.id,
					text: row.text,
					referencedInstructionIds: row.referencedInstructionIds,
				})),
			};
		},

		async list() {
			const rows = await db
				.select({
					publicId: recipe.publicId,
					name: recipe.name,
					servings: recipe.servings,
				})
				.from(recipe)
				.where(eq(recipe.userId, userId))
				.orderBy(desc(recipe.createdAt));

			return rows.map((row) => ({
				publicId: row.publicId,
				name: row.name,
				servings: Number(row.servings),
			}));
		},
	};
}
