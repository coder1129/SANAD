import { describe, expect, it } from 'vitest';
import type { CareerPackage } from '@/types/domain';
import { getPackageCurrentPrice } from './presentation';

function packageWithLimitedOffer(price: number): CareerPackage {
  return {
    id: 1,
    name: 'Package',
    description: null,
    price,
    features: [],
    deliveryDays: 1,
    maxRevisions: 0,
    sortOrder: 1,
    images: [],
    offers: [
      {
        id: 1,
        name: '50% OFF (Limited Offer)',
        description: null,
        discountPercentage: 50,
      },
    ],
    buyerCount: 0,
    ratingAverage: null,
    ratingCount: 0,
  };
}

describe('limited package pricing', () => {
  it.each([
    [800, 400],
    [650, 325],
    [250, 125],
  ])('reduces %s AED to %s AED', (originalPrice, expectedPrice) => {
    expect(getPackageCurrentPrice(packageWithLimitedOffer(originalPrice))).toBe(
      expectedPrice,
    );
  });
});
