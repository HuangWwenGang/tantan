import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateItemPrice } from '../c-app/utils/pricing.ts';
import { specsKey } from '../c-app/utils/specs.ts';
import type { MenuItem, SpecSelection } from '../c-app/types.ts';

const drink: MenuItem = {
  id: 'drink', vendorId: 'stall-a', name: 'Demo drink', description: '',
  price: 12, imageUrl: '', category: 'drinks',
  options: [
    { name: 'Size', choices: [{ label: 'Regular' }, { label: 'Extra', priceDelta: 4 }] },
    { name: 'Topping', choices: [{ label: 'Extra', priceDelta: 2 }, { label: 'None' }] },
    { name: 'Cup', choices: [{ label: 'Reusable', priceDelta: -1 }] },
  ],
};

test('identically named choices in different option groups do not double charge', () => {
  assert.equal(calculateItemPrice(drink, [{ option: 'Size', label: 'Extra' }]), 16);
  assert.equal(calculateItemPrice(drink, [{ option: 'Topping', label: 'Extra' }]), 14);
  assert.equal(calculateItemPrice(drink, [
    { option: 'Size', label: 'Extra' },
    { option: 'Topping', label: 'Extra' },
    { option: 'Cup', label: 'Reusable' },
  ]), 17);
});

test('displayed prices use catalog deltas and ignore duplicate or unknown selections', () => {
  const selected: SpecSelection = { option: 'Size', label: 'Extra', priceDelta: -999 };
  assert.equal(calculateItemPrice(drink, [selected, selected]), 16);
  assert.equal(calculateItemPrice(drink, [{ option: 'Size', label: 'Missing', priceDelta: 99 }]), 12);
});

test('cart keys merge reordered selections but preserve the selected option group', () => {
  const selections: SpecSelection[] = [
    { option: 'Size', label: 'Extra' },
    { option: 'Cup', label: 'Reusable' },
  ];
  assert.equal(specsKey(selections), specsKey([...selections].reverse()));
  assert.notEqual(specsKey([{ option: 'Size', label: 'Extra' }]), specsKey([{ option: 'Topping', label: 'Extra' }]));
});
