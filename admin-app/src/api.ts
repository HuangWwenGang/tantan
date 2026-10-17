import type { AppConfig, Vendor, CreateVendorRequest, PlatformStats, Order } from './types';

// API基础地址（通过Vite代理到8787端口）
const API_BASE = '/api';
const ADMIN_TOKEN_KEY = 'tantan_admin_token';

const getAdminToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
};

const setAdminToken = (token: string) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
};

const clearAdminToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
};

const hasAdminToken = (): boolean => Boolean(getAdminToken());

// 通用请求函数
const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getAdminToken() ? { 'X-Admin-Token': getAdminToken() } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || `请求失败: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

// 工具函数：数据转换
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

type PlatformOrder = {
  status?: string;
  totalPrice?: number;
  finalTotal?: number;
  createdAt?: string;
  date?: string;
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getOrderDate = (order: PlatformOrder): Date | null =>
  parseDate(order.createdAt) || parseDate(order.date);

const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getOrderAmount = (order: PlatformOrder): number =>
  toNumber(order.finalTotal ?? order.totalPrice, 0);

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
  const summary = toString(raw?.itemsSummary, items.map((item: any) => `${item.name} x${item.count}`).join(', '));

  return {
    id: toString(raw?.id),
    vendorId: toString(raw?.vendorId),
    vendorName: toString(raw?.vendorName),
    status: normalizeOrderStatus(raw?.status),
    orderType: raw?.orderType === 'delivery' ? 'delivery' : 'dine-in',
    itemsSummary: summary,
    items,
    totalPrice: toNumber(raw?.totalPrice, 0),
    finalTotal: raw?.finalTotal === undefined ? undefined : toNumber(raw?.finalTotal, 0),
    date: toString(raw?.date),
    createdAt: toString(raw?.createdAt, ''),
    statusUpdatedAt: toString(raw?.statusUpdatedAt, ''),
    paidAt: toString(raw?.paidAt, ''),
    completedAt: toString(raw?.completedAt, ''),
    cancelReason: typeof raw?.cancelReason === 'string' ? raw.cancelReason : undefined,
    paymentMethod: toString(raw?.paymentMethod, ''),
    paymentStatus: typeof raw?.paymentStatus === 'string' ? raw.paymentStatus : undefined,
    buyerPhone: toString(raw?.buyerPhone, ''),
    paymentProofs: normalizePaymentProofs(raw?.paymentProofs),
  };
};

// 标准化商户数据
const normalizeVendor = (raw: any): Vendor => {
  const status = ['active', 'banned', 'pending'].includes(raw?.status) ? raw.status : 'active';
  return {
    id: toString(raw?.id),
    code: toString(raw?.code),
    password: raw?.password ? toString(raw.password) : undefined,
    name: toString(raw?.name),
    category: toString(raw?.category),
    status: status as Vendor['status'],
    isOpen: toBoolean(raw?.isOpen, true),
    rating: toNumber(raw?.rating, 4.5),
    imageUrl: toString(raw?.imageUrl),
    location: toString(raw?.location),
    locationShort: toString(raw?.locationShort, ''),
    phone: toString(raw?.phone, ''),
    ownerName: toString(raw?.ownerName, ''),
    revenue: toNumber(raw?.revenue, 0),
    createdAt: toString(raw?.createdAt, ''),
    businessHours: raw?.businessHours ? toString(raw.businessHours) : undefined,
    qualificationImage: toString(raw?.qualificationImage, ''),
    qualificationUploadedAt: toString(raw?.qualificationUploadedAt, ''),
    signImage: toString(raw?.signImage, ''),
    signUploadedAt: toString(raw?.signUploadedAt, ''),
  };
};

// ==================== API 方法 ====================

export const api = {
  loginAdmin: async (username: string, password: string): Promise<{ username: string }> => {
    const data = await request<{ admin?: { username?: string }; token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data?.token) {
      setAdminToken(data.token);
    }
    return { username: data?.admin?.username || username };
  },

  clearAdminToken: () => {
    clearAdminToken();
  },

  hasAdminToken: () => hasAdminToken(),
  // 1. 获取所有商户
  getVendors: async (): Promise<Vendor[]> => {
    const data = await request<any[]>('/vendors');
    return data.map(normalizeVendor);
  },

  // 2. 创建新商户（开通账号）
  createVendor: async (payload: CreateVendorRequest): Promise<Vendor> => {
    const data = await request<any>('/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeVendor(data);
  },

  // 3. 更新商户状态（封禁/激活）
  updateVendorStatus: async (id: string, status: Vendor['status']): Promise<Vendor> => {
    const data = await request<any>(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return normalizeVendor(data);
  },

  // 3.1 删除商户
  deleteVendor: async (id: string): Promise<void> => {
    await request<void>(`/vendors/${id}`, {
      method: 'DELETE',
    });
  },

  // 4. 获取应用配置（功能开关）
  getAppConfig: async (): Promise<AppConfig> => {
    return request<AppConfig>('/app-config');
  },

  // 5. 更新应用配置（功能开关）
  updateAppConfig: async (config: AppConfig): Promise<AppConfig> => {
    return request<AppConfig>('/app-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  getOrders: async (): Promise<Order[]> => {
    const data = await request<any[]>('/orders');
    return data.map(normalizeOrder);
  },

  getDeliveryUrgeCounts: async (): Promise<Record<string, number>> => {
    const data = await request<{ counts?: Record<string, number> }>('/delivery-urges');
    return data?.counts || {};
  },

  // 6. 获取平台统计数据
  getPlatformStats: async (): Promise<PlatformStats> => {
    // 注意：这个API需要后端实现，目前前端先基于vendors数据计算
    const vendors = await api.getVendors();
    const orders = await request<PlatformOrder[]>('/orders');

    // 动态导入 isVendorClosed 函数（避免循环依赖）
    const { isVendorClosed } = await import('./utils/availability');

    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    // 计算实际营业中的商户（考虑营业时间）
    const openVendors = vendors.filter(v =>
      v.status === 'active' && !isVendorClosed(v.businessHours, v.isOpen)
    ).length;
    const pendingVendors = vendors.filter(v => v.status === 'pending').length;
    const bannedVendors = vendors.filter(v => v.status === 'banned').length;
    const completedOrders = orders.filter(order => order.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const totalOrders = completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const now = new Date();
    const todayOrders = completedOrders.filter((order) => {
      const orderDate = getOrderDate(order);
      return orderDate ? isSameDay(orderDate, now) : false;
    }).length;
    const todayRevenue = completedOrders.reduce((sum, order) => {
      const orderDate = getOrderDate(order);
      if (!orderDate || !isSameDay(orderDate, now)) return sum;
      return sum + getOrderAmount(order);
    }, 0);

    return {
      totalVendors,
      activeVendors,
      openVendors,
      pendingVendors,
      bannedVendors,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      todayRevenue,
      todayOrders,
    };
  },

  // 7. 生成商户二维码
  getVendorQRCode: async (vendorId: string, baseUrl?: string): Promise<{ qrDataUrl: string; url: string }> => {
    const query = baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : '';
    return request<{ qrDataUrl: string; url: string }>(`/vendors/${vendorId}/qrcode${query}`);
  },
};
