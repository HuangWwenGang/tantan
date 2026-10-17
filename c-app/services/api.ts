import type { Address, MenuItem, Order, Vendor, SpecSelection } from '../types';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

const getBuyerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const key = 'tantan_buyer_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated =
    (window.crypto && 'randomUUID' in window.crypto && window.crypto.randomUUID())
      ? window.crypto.randomUUID()
      : `buyer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.localStorage.setItem(key, generated);
  return generated;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { body, headers, ...rest } = options;
  const buyerId = getBuyerId();
  const response = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(buyerId ? { 'X-Buyer-Id': buyerId } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const parsed = JSON.parse(errorText);
      if (parsed && typeof parsed.error === 'string') {
        throw new Error(parsed.error);
      }
    } catch {
      // fall through to raw text
    }
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export interface AppConfig {
  defaultAddress?: Address;
  // 功能开关
  enableClientReviews?: boolean;
  showBusinessHours?: boolean;
  showQualifications?: boolean;
  showContactPhone?: boolean;
  showMerchantSlogan?: boolean;
  helpCenterTitle?: string;
  helpCenterHours?: string;
  helpCenterContactLabel?: string;
  helpCenterContactValue?: string;
  helpCenterFaqs?: HelpCenterFaq[];
}

export interface HelpCenterFaq {
  question: string;
  answer: string;
}

export interface CreateOrderPayload {
  items: { productId: string; count: number; specs: SpecSelection[] }[];
  mode: 'delivery' | 'dine-in';
  remarks?: Record<string, string>;
  deliveryTime?: string;
  paymentMethod?: string;
  buyerPhone?: string;
}

export const fetchConfig = async (): Promise<AppConfig> => {
  const appConfig = await request<any>('/api/app-config');
  const defaultAddress = await request<{ defaultAddress?: Address }>('/api/config');
  return {
    ...appConfig,
    defaultAddress: defaultAddress.defaultAddress,
  };
};

export const fetchVendors = async (): Promise<Vendor[]> => request<Vendor[]>('/api/vendors');

export const fetchProducts = async (): Promise<MenuItem[]> => request<MenuItem[]>('/api/products');

export const fetchOrders = async (): Promise<Order[]> => request<Order[]>('/api/orders');

export const fetchOrdersByPhone = async (buyerPhone: string): Promise<Order[]> => {
  const normalized = buyerPhone.replace(/\D/g, '');
  if (!normalized) return [];
  return request<Order[]>(`/api/orders?buyerPhone=${encodeURIComponent(normalized)}`);
};

export const createOrders = async (payload: CreateOrderPayload): Promise<Order[]> =>
  request<Order[]>('/api/orders', { method: 'POST', body: payload });

export const updateOrderStatus = async (
  id: string,
  status: Order['status'],
  cancelReason?: string
): Promise<Order> =>
  request<Order>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: { status, ...(cancelReason ? { cancelReason } : {}) },
  });

export const uploadOrderPaymentProof = async (id: string, image: string): Promise<Order> =>
  request<Order>(`/api/orders/${id}/payment-proof`, {
    method: 'POST',
    body: { image },
  });

export const recordDeliveryUrge = async (vendorIds: string[]): Promise<void> => {
  if (!Array.isArray(vendorIds) || vendorIds.length === 0) return;
  await request('/api/delivery-urges', { method: 'POST', body: { vendorIds } });
};

export { request };
