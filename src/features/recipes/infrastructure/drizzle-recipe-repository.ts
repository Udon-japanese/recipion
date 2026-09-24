import * as v from "valibot";

import type { DB } from "#/db/client";

import type {
	CreateRecipeCommand,
	RecipeRepository,
} from "../application/recipe-repository";
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

export function createDrizzleRecipeRepository(
	db: DB,
	userId: string,
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
						name: command.name,
						servings: formatRecipeServings(command.servings),
						note: command.note,
					})
					.returning({ id: recipe.id });

				if (!createdRecipe) {
					throw new Error("レシピを作成できませんでした");
				}

				// 親グループが先に並ぶため、材料は順番に保存する。
				for (const node of command.ingredients) {
					await transaction.insert(recipeIngredientNode).values({
						id: node.id,
						recipeId: createdRecipe.id,
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
							recipeId: createdRecipe.id,
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
							recipeId: createdRecipe.id,
							userId,
							sortOrder: item.sortOrder,
							text: item.text,
							referencedInstructionIds: item.referencedInstructionIds,
						})),
					);
				}

				return { id: createdRecipe.id };
			});
		},
	};
}
