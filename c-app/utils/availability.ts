import type { MenuItem } from '../types';

export const SOLD_OUT_PRODUCT_IDS: Record<string, string[]> = {
  v3: ['m3_20', 'm3_21'],
};

export const isProductSoldOut = (product: MenuItem): boolean => {
  if (product.status === 'soldout') return true;
  if (product.stockLimit && product.stockLimit > 0) {
    const dailySales = product.dailySales ?? 0;
    return dailySales >= product.stockLimit;
  }
  return false;
};

export const getSoldOutProductIds = (vendorId: string, products?: MenuItem[]): Set<string> => {
  if (products && products.length > 0) {
    return new Set(
      products
        .filter((product) => product.vendorId === vendorId)
        .filter(isProductSoldOut)
        .map((product) => product.id)
    );
  }
  return new Set(SOLD_OUT_PRODUCT_IDS[vendorId] || []);
};

const parseBusinessHours = (hours?: string): { start: number; end: number } | null => {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  return { start: toMinutes(match[1]), end: toMinutes(match[2]) };
};

export const isVendorClosed = (
  businessHours?: string,
  isOpen: boolean = true,
  now: Date = new Date()
): boolean => {
  if (!isOpen) return true;
  const range = parseBusinessHours(businessHours);
  if (!range) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (range.start <= range.end) {
    return nowMinutes < range.start || nowMinutes > range.end;
  }
  return nowMinutes < range.start && nowMinutes > range.end;
};
