import { describe, it, expect, afterEach } from 'vitest';
import { useRestaurantStore } from '../restaurantStore';
import { Restaurant } from '../../types';

const mockRestaurant = (overrides?: Partial<Restaurant>): Restaurant => ({
  id: 'restaurant-1',
  name: 'Sushi Place',
  cuisine: 'Japanese',
  openTime: '09:00',
  closeTime: '21:00',
  deliveryTime: '35 minutes',
  hasMenu: true,
  imageUrl: 'https://example.com/sushi.png',
  companyId: 'company-1',
  menuItems: [],
  ...overrides,
});

describe('restaurantStore', () => {
  afterEach(() => {
    useRestaurantStore.setState({ restaurants: [] });
  });

  it('stores restaurant list', () => {
    const restaurants = [
      mockRestaurant(),
      mockRestaurant({ id: 'restaurant-2', name: 'Pizza Planet' }),
    ];

    useRestaurantStore.getState().setRestaurants(restaurants);

    expect(useRestaurantStore.getState().restaurants).toEqual(restaurants);
  });
});
