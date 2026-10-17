import type { SpecLike, SpecSelection } from '../types';

const defaultOption = 'spec';

export const normalizeSpecs = (specs?: SpecLike[]): SpecSelection[] => {
  if (!specs) return [];
  return specs.map((spec) => (
    typeof spec === 'string' ? { option: defaultOption, label: spec } : spec
  ));
};

export const specLabels = (specs?: SpecLike[]): string[] =>
  normalizeSpecs(specs).map((spec) => spec.label);

export const specsKey = (specs?: SpecLike[]): string =>
  normalizeSpecs(specs)
    .map((spec) => `${spec.option}:${spec.label}`)
    .sort()
    .join('|');
