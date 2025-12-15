import type { Item, ItemResponse } from "@/types/item";

/**
 * Item Mapper - Transforms between Item entities and API responses
 *
 * This keeps the mapping logic centralized and reusable across handlers.
 */

export class ItemMapper {
  /**
   * Transform Item entity to ItemResponse for API responses
   */
  static toResponse(item: Item): ItemResponse {
    return {
      id: item.sk, // Use sort key as the item ID
      name: item.name,
      description: item.description,
      category: item.category,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Transform multiple Item entities to ItemResponse array
   */
  static toResponseArray(items: Item[]): ItemResponse[] {
    return items.map((item) => ItemMapper.toResponse(item));
  }
}
