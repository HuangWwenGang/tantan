import type { AppConfig, Merchant, MenuItem, Order } from './types';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
const MERCHANT_TOKEN_KEY = 'tantan_merchant_token';

const getMerchantToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(MERCHANT_TOKEN_KEY) || '';
};

export const getMerchantAuthHeaders = (): Record<string, string> => {
  const token = getMerchantToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const setMerchantToken = (token: string) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(MERCHANT_TOKEN_KEY, token);
  }
};

const clearMerchantToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(MERCHANT_TOKEN_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getMerchantToken() ? { Authorization: `Bearer ${getMerchantToken()}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    const message = data?.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
};

const normalizeMerchant = (raw: any): Merchant => {
  const status = ['active', 'banned', 'pending'].includes(raw?.status) ? raw.status : 'active';
  return {
    id: toString(raw?.id),
    code: toString(raw?.code),
    name: toString(raw?.name),
    category: toString(raw?.category),
    status: status as Merchant['status'],
    isOpen: toBoolean(raw?.isOpen, true),
    rating: toNumber(raw?.rating, 4.6),
    imageUrl: toString(raw?.imageUrl),
    location: toString(raw?.location),
    locationShort: toString(raw?.locationShort, ''),
    lastVisited: toString(raw?.lastVisited, ''),
    menuCategories: Array.isArray(raw?.menuCategories) ? raw.menuCategories.map(String) : [],
    description: toString(raw?.description, ''),
    businessHours: toString(raw?.businessHours, ''),
    phone: toString(raw?.phone, ''),
    paymentWechatQr: toString(raw?.paymentWechatQr, ''),
    paymentAlipayQr: toString(raw?.paymentAlipayQr, ''),
    qualifications: Array.isArray(raw?.qualifications) ? raw.qualifications.map(String) : [],
    qualificationImage: toString(raw?.qualificationImage, ''),
    qualificationUploadedAt: toString(raw?.qualificationUploadedAt, ''),
    signImage: toString(raw?.signImage, ''),
    signUploadedAt: toString(raw?.signUploadedAt, ''),
    ownerName: toString(raw?.ownerName, ''),
    revenue: toNumber(raw?.revenue, 0),
  };
};

const normalizeProduct = (raw: any): MenuItem => {
  const status = raw?.status === 'soldout' ? 'soldout' : 'available';
  return {
    id: toString(raw?.id),
    vendorId: toString(raw?.vendorId),
    name: toString(raw?.name),
    description: toString(raw?.description),
    price: toNumber(raw?.price, 0),
    imageUrl: toString(raw?.imageUrl),
    imageUrls: Array.isArray(raw?.imageUrls) ? raw.imageUrls.map(String) : undefined,
    category: toString(raw?.category),
    isSpicy: raw?.isSpicy ? true : undefined,
    isHot: raw?.isHot ? true : undefined,
    options: Array.isArray(raw?.options) ? raw.options : [],
    status: status as MenuItem['status'],
    stockLimit: raw?.stockLimit === undefined ? 0 : toNumber(raw?.stockLimit, 0),
    dailySales: raw?.dailySales === undefined ? 0 : toNumber(raw?.dailySales, 0),
  };
};

const normalizeSpecs = (specs: any): string[] | undefined => {
  if (!Array.isArray(specs)) return undefined;
  const normalized = specs
    .map((spec) => {
      if (typeof spec === 'string') return spec;
      if (spec && typeof spec === 'object' && typeof spec.label === 'string') return spec.label;
      return '';
    })
    .filter(Boolean);
  return normalized.length ? normalized : undefined;
};

const normalizePaymentProofs = (value: any): Order['paymentProofs'] => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => {
      const url = toString(item?.url);
      if (!url) return null;
      return {
        url,
        uploadedAt: toString(item?.uploadedAt),
      };
    })
    .filter(Boolean);
  return normalized.length ? (normalized as Order['paymentProofs']) : undefined;
};

const normalizeOrderStatus = (status: unknown): Order['status'] => {
  const raw = typeof status === 'string' ? status : '';
  if (['pending-payment', 'pending-confirmation', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'].includes(raw)) {
    return raw as Order['status'];
  }
  return 'pending-payment';
};

const normalizeOrder = (raw: any): Order => {
  const rawItems = Array.isArray(raw?.detailedItems) ? raw.detailedItems : Array.isArray(raw?.items) ? raw.items : [];
  const items = rawItems.map((item: any) => ({
    name: toString(item?.name),
    count: toNumber(item?.count, 0),
    price: toNumber(item?.price ?? item?.subtotal, 0),
    specs: normalizeSpecs(item?.specs),
    imageUrl: typeof item?.imageUrl === 'string' ? item.imageUrl : undefined,
  }));
  const count = toNumber(raw?.count, items.reduce((sum: number, item: any) => sum + (item.count || 0), 0));
  const summary = toString(raw?.itemsSummary, items.map((item: any) => `${item.name} x${item.count}`).join(', '));

  return {
    id: toString(raw?.id),
    orderNo: toString(raw?.orderNo, ''),
    vendorId: toString(raw?.vendorId),
    vendorName: toString(raw?.vendorName),
    vendorImage: toString(raw?.vendorImage),
    vendorLocation: toString(raw?.vendorLocation, ''),
    status: normalizeOrderStatus(raw?.status),
    orderType: raw?.orderType === 'delivery' ? 'delivery' : 'dine-in',
    pickupCode: typeof raw?.pickupCode === 'string' ? raw.pickupCode : undefined,
    itemsSummary: summary,
    items,
    subtotal: raw?.subtotal === undefined ? undefined : toNumber(raw?.subtotal, 0),
    packagingFee: raw?.packagingFee === undefined ? undefined : toNumber(raw?.packagingFee, 0),
    serviceFee: raw?.serviceFee === undefined ? undefined : toNumber(raw?.serviceFee, 0),
    deliveryFee: raw?.deliveryFee === undefined ? undefined : toNumber(raw?.deliveryFee, 0),
    discount: raw?.discount === undefined ? undefined : toNumber(raw?.discount, 0),
    totalPrice: toNumber(raw?.totalPrice, 0),
    finalTotal: raw?.finalTotal === undefined ? undefined : toNumber(raw?.finalTotal, 0),
    date: toString(raw?.date),
    createdAt: toString(raw?.createdAt, ''),
    statusUpdatedAt: toString(raw?.statusUpdatedAt, ''),
    paidAt: toString(raw?.paidAt, ''),
    completedAt: toString(raw?.completedAt, ''),
    count,
    cancelReason: typeof raw?.cancelReason === 'string' ? raw.cancelReason : undefined,
    riderName: toString(raw?.riderName, ''),
    riderPhone: toString(raw?.riderPhone, ''),
    deliveryTime: toString(raw?.deliveryTime, ''),
    remarks: toString(raw?.remarks, ''),
    paymentStatus: typeof raw?.paymentStatus === 'string' ? raw.paymentStatus : undefined,
    paymentMethod: toString(raw?.paymentMethod, ''),
    transactionId: toString(raw?.transactionId, ''),
    buyerPhone: toString(raw?.buyerPhone, ''),
    address: raw?.address,
    paymentProofs: normalizePaymentProofs(raw?.paymentProofs),
  };
};

export const api = {
  getMerchants: async () => {
    const data = await request<Merchant[]>('/api/vendors');
    return data.map(normalizeMerchant);
  },
  updateMerchant: async (id: string, updates: Partial<Merchant>) => {
    const data = await request<Merchant>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeMerchant(data);
  },
  getProducts: async () => {
    const data = await request<MenuItem[]>('/api/products');
    return data.map(normalizeProduct);
  },
  createProduct: async (payload: Partial<MenuItem>) => {
    const data = await request<MenuItem>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeProduct(data);
  },
  updateProduct: async (id: string, payload: Partial<MenuItem>) => {
    const data = await request<MenuItem>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return normalizeProduct(data);
  },
  deleteProduct: async (id: string) => {
    await request<void>(`/api/products/${id}`, { method: 'DELETE' });
  },
  getOrders: async () => {
    const data = await request<Order[]>('/api/orders');
    return data.map(normalizeOrder);
  },
  updateOrderStatus: async (id: string, status: Order['status'], cancelReason?: string) => {
    const payload: Record<string, unknown> = { status };
    if (cancelReason) payload.cancelReason = cancelReason;
    const data = await request<Order>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return normalizeOrder(data);
  },
  loginMerchant: async (code: string, password: string) => {
    const data = await request<{ vendor?: Merchant; token?: string }>('/api/merchant/login', {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    });
    if (data?.token) {
      setMerchantToken(data.token);
    }
    const vendor = data?.vendor ? normalizeMerchant(data.vendor) : normalizeMerchant(data as Merchant);
    return vendor;
  },
  getAppConfig: async () => request<AppConfig>('/api/app-config'),
  updateAppConfig: async (config: AppConfig) =>
    request<AppConfig>('/api/app-config', { method: 'PUT', body: JSON.stringify(config) }),
};

export const merchantAuth = {
  clear: clearMerchantToken,
};
