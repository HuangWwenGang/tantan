import type { MenuItem, SpecLike } from '../types';
import { normalizeSpecs } from './specs';

export const calculateItemPrice = (product: MenuItem, specs: SpecLike[] = []): number => {
  let total = product.price;
  if (!product.options) return total;

  const normalized = normalizeSpecs(specs);

  product.options.forEach((option) => {
    option.choices.forEach((choice) => {
      const matched = normalized.some(
        (spec) => spec.label === choice.label && (spec.option === option.name || spec.option === 'spec')
      );
      if (matched && choice.priceDelta) {
        total += choice.priceDelta;
      }
    });
  });

  return total;
};
