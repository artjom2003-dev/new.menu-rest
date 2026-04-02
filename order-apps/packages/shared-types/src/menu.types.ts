import { DishStation } from './enums';

export interface MenuDish {
  id: number;
  name: string;
  description?: string;
  composition?: string;
  categoryName: string;
  price: number;
  weightGrams?: number;
  volumeMl?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  photoUrl?: string;
  isAvailable: boolean;
  prepTimeMin?: number;
  station?: DishStation;
  allergens?: string[];
}

export interface MenuCategory {
  name: string;
  dishes: MenuDish[];
}

export interface RestaurantMenu {
  restaurantId: number;
  restaurantName: string;
  restaurantLogo?: string;
  categories: MenuCategory[];
}
