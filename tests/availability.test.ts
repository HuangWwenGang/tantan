import assert from 'node:assert/strict';
import test from 'node:test';
import { getSoldOutProductIds, isProductSoldOut, isVendorClosed } from '../c-app/utils/availability.ts';
import type { MenuItem } from '../c-app/types.ts';

// Local dates keep these business-hour tests independent of the machine's time zone.
const at = (hour: number, minute: number = 0) => new Date(2026, 0, 19, hour, minute);
const product = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: 'snack', vendorId: 'stall-a', name: 'Demo snack', description: '',
  price: 12, imageUrl: '', category: 'snacks', ...overrides,
});

test('overnight hours stay open across midnight and close outside the interval', () => {
  const hours = '18:00 - 02:00';
  assert.equal(isVendorClosed(hours, true, at(17, 59)), true);
  assert.equal(isVendorClosed(hours, true, at(18)), false);
  assert.equal(isVendorClosed(hours, true, at(23, 59)), false);
  assert.equal(isVendorClosed(hours, true, at(0)), false);
  assert.equal(isVendorClosed(hours, true, at(1, 59)), false);
  assert.equal(isVendorClosed(hours, true, at(2, 1)), true);
});

test('a merchant can close manually during its scheduled opening hours', () => {
  assert.equal(isVendorClosed('09:00 - 21:00', true, at(12)), false);
  assert.equal(isVendorClosed('09:00 - 21:00', false, at(12)), true);
  assert.equal(isVendorClosed(undefined, false, at(12)), true);
});

test('daily stock sells out at the limit while zero means unlimited', () => {
  assert.equal(isProductSoldOut(product({ stockLimit: 5, dailySales: 4 })), false);
  assert.equal(isProductSoldOut(product({ stockLimit: 5, dailySales: 5 })), true);
  assert.equal(isProductSoldOut(product({ stockLimit: 0, dailySales: 99 })), false);
  assert.equal(isProductSoldOut(product({ status: 'soldout', stockLimit: 0 })), true);
});

test('a storefront only receives sold-out products belonging to that merchant', () => {
  const products = [
    product({ id: 'manual', status: 'soldout' }),
    product({ id: 'limited', stockLimit: 3, dailySales: 3 }),
    product({ id: 'available', stockLimit: 3, dailySales: 1 }),
    product({ id: 'other-stall', vendorId: 'stall-b', status: 'soldout' }),
  ];
  assert.deepEqual([...getSoldOutProductIds('stall-a', products)].sort(), ['limited', 'manual']);
  assert.deepEqual([...getSoldOutProductIds('unknown-stall', products)], []);
});
