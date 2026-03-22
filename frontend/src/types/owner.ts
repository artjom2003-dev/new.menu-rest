export interface MyRestaurant {
  id: number; name: string; slug: string; description?: string;
  phone?: string; website?: string; hasWifi?: boolean; hasDelivery?: boolean;
  averageBill?: number; rating?: number; reviewCount?: number;
  photos?: Array<{ id: number; url: string; isCover: boolean }>;
  cuisines?: Array<{ name: string }>;
  city?: { name: string };
  address?: string;
  metroStation?: string;
  venueType?: string;
  priceLevel?: number;
  instagram?: string;
  vk?: string;
  email?: string;
  workingHours?: Array<{ id: number; dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }>;
  features?: Array<{ id: number; name: string; slug: string; category: string; icon?: string | null }>;
}

export interface Post {
  id: number; title: string; body: string; category: string;
  status: string; createdAt: string; publishedAt?: string;
}

export interface MenuDish {
  id: number;
  dishId: number;
  categoryName: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  dish: {
    id: number;
    name: string;
    description?: string;
    composition?: string;
    weightGrams?: number;
    volumeMl?: number;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    imageUrl?: string;
    allergens?: Array<{ id: number; name: string }>;
  };
}
