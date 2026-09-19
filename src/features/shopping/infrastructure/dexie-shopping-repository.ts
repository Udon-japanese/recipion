import { getLocalDatabase } from "../../../local-db/database"
import type { ShoppingRepository } from "../application/shopping-repository"

export const dexieShoppingRepository = {
  async list() {
    return getLocalDatabase().shoppingItems.orderBy("createdAt").toArray()
  },

  async findById(id) {
    return getLocalDatabase().shoppingItems.get(id)
  },

  async save(item) {
    await getLocalDatabase().shoppingItems.put(item)
  },

  async remove(id) {
    await getLocalDatabase().shoppingItems.delete(id)
  },
} satisfies ShoppingRepository