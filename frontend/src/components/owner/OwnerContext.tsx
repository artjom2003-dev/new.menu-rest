'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { MyRestaurant, Post } from '@/types/owner';

interface OwnerContextValue {
  myRestaurant: MyRestaurant | null;
  posts: Post[];
  setMyRestaurant: Dispatch<SetStateAction<MyRestaurant | null>>;
  setPosts: Dispatch<SetStateAction<Post[]>>;
  loading: boolean;
}

export const OwnerContext = createContext<OwnerContextValue>({
  myRestaurant: null,
  posts: [],
  setMyRestaurant: () => {},
  setPosts: () => {},
  loading: true,
});

export function useOwner() {
  return useContext(OwnerContext);
}
