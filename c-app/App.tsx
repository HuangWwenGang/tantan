
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Home, FileText, User } from './components/Icons';
import { VendorView } from './components/VendorView';
import { HomeView } from './components/HomeView';
import { OrderListView } from './components/OrderListView';
import { UserProfileView } from './components/UserProfileView';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutView } from './components/CheckoutView';
import { OrderDetailView } from './components/OrderDetailView';
// Import sub-views
import {
  UserAddressView,
  UserFavoritesView,
  UserCouponsView,
  UserFeedbackView,
  UserHelpView,
} from './components/UserSubViews';

import { Vendor, CartState, Order, MenuItem, Address, SpecSelection, AppConfig, HelpCenterFaq } from './types';
import { createOrders, fetchConfig, fetchOrders, fetchProducts, fetchVendors, updateOrderStatus } from './services/api';
import { specsKey } from './utils/specs';
import { useBodyScrollLock } from './utils/useBodyScrollLock';

const fallbackHelpFaqs: HelpCenterFaq[] = [
  { question: '\u53ef\u4ee5\u7528\u73b0\u91d1\u652f\u4ed8\u5417\uff1f', answer: '\u76ee\u524d\u652f\u6301\u5fae\u4fe1\u548c\u652f\u4ed8\u5b9d\u626b\u7801\u652f\u4ed8\uff0c\u6682\u4e0d\u652f\u6301\u73b0\u91d1\u3002' },
  { question: '\u4e0b\u5355\u540e\u53ef\u4ee5\u53d6\u6d88\u5417\uff1f', answer: '\u53ef\u4ee5\uff0c\u8bf7\u5728\u672a\u5236\u4f5c\u524d\u53d6\u6d88\uff0c\u8be6\u60c5\u8bf7\u8054\u7cfb\u644a\u4e3b\u3002' },
  { question: '\u5982\u679c\u627e\u4e0d\u5230\u644a\u4f4d\u600e\u4e48\u529e\uff1f', answer: '\u70b9\u51fb\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d\u6216\u62e8\u6253\u5546\u5bb6\u7535\u8bdd\u83b7\u53d6\u5e2e\u52a9\u3002' },
];

const normalizeHelpFaqs = (value: unknown): HelpCenterFaq[] => {
  if (!Array.isArray(value)) return fallbackHelpFaqs;
  const normalized = value
    .map((item) => {
      if (typeof item === 'string') {
        const question = item.trim();
        return question ? { question, answer: '' } : null;
      }
      if (item && typeof item === 'object') {
        const record = item as { question?: unknown; answer?: unknown };
        const question = typeof record.question === 'string' ? record.question.trim() : '';
        const answer = typeof record.answer === 'string' ? record.answer.trim() : '';
        return question ? { question, answer } : null;
      }
      return null;
    })
    .filter((item): item is HelpCenterFaq => Boolean(item));
  return normalized.length > 0 ? normalized : fallbackHelpFaqs;
};

type ViewType = 
  | 'home' | 'vendor' | 'checkout' | 'orderDetail' 
  | 'user-address' | 'user-favorites' | 'user-coupons' | 'user-feedback' | 'user-help';

export default function App() {
  const visitedKey = 'tantan_visited_vendors';
  const visitedCacheKey = 'tantan_visited_vendor_cache';
  const favoriteKey = 'tantan_favorite_vendors';
  const [activeTab, setActiveTab] = useState<'home' | 'order' | 'user'>('home');
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    enableClientReviews: true,
    showBusinessHours: true,
    showQualifications: true,
    showContactPhone: true,
    showMerchantSlogan: true,
    helpCenterTitle: '客服在线时间',
    helpCenterHours: '10:00 - 24:00',
    helpCenterContactLabel: '联系人工客服',
    helpCenterContactValue: 'kefu_wechat',
    helpCenterFaqs: fallbackHelpFaqs,
  });

  const [cart, setCart] = useState<CartState>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingVendorCode, setPendingVendorCode] = useState<string | null>(null);
  const [orderDetailReturnTab, setOrderDetailReturnTab] = useState<'home' | 'order' | 'user'>('home');
  const homeScrollRef = useRef(0);
  const orderScrollRef = useRef(0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [reviewTargetOrderId, setReviewTargetOrderId] = useState<string | null>(null);
  const [visitedVendorIds, setVisitedVendorIds] = useState<string[]>([]);
  const [visitedVendorCache, setVisitedVendorCache] = useState<Record<string, Vendor>>({});
  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>([]);
  const [visitedHydrated, setVisitedHydrated] = useState(false);
  const [visitedCacheHydrated, setVisitedCacheHydrated] = useState(false);
  const [favoriteHydrated, setFavoriteHydrated] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('');
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const vendorById = useMemo(() => {
    return new Map(vendors.map((vendor) => [vendor.id, vendor]));
  }, [vendors]);

  const normalizeOrderVendorImage = useCallback(
    (order: Order) => {
      const currentImage =
        typeof order.vendorImage === 'string' ? order.vendorImage.trim() : '';
      const fallback = vendorById.get(order.vendorId)?.imageUrl?.trim();
      if (!fallback) return order;
      if (currentImage === fallback) return order;
      return { ...order, vendorImage: fallback };
    },
    [vendorById]
  );

  const ordersWithVendorImage = useMemo(
    () => orders.map((order) => normalizeOrderVendorImage(order)),
    [orders, normalizeOrderVendorImage]
  );

  const selectedOrderWithVendorImage = useMemo(
    () => (selectedOrder ? normalizeOrderVendorImage(selectedOrder) : null),
    [selectedOrder, normalizeOrderVendorImage]
  );

  const visitedVendors = useMemo(() => {
    if (visitedVendorIds.length === 0) return [];
    return visitedVendorIds
      .map((id) => vendorById.get(id) || visitedVendorCache[id])
      .filter((vendor): vendor is Vendor => Boolean(vendor));
  }, [visitedVendorIds, vendorById, visitedVendorCache]);

  const favoriteVendors = useMemo(() => {
    if (favoriteVendorIds.length === 0) return [];
    return favoriteVendorIds
      .map((id) => vendorById.get(id))
      .filter((vendor): vendor is Vendor => Boolean(vendor));
  }, [favoriteVendorIds, vendorById]);

  const recordVendorVisit = useCallback((vendorId: string, vendor?: Vendor) => {
    setVisitedVendorIds((prev) => {
      const next = [vendorId, ...prev.filter((id) => id !== vendorId)];
      return next.slice(0, 12);
    });
    if (vendor) {
      setVisitedVendorCache((prev) => ({ ...prev, [vendorId]: vendor }));
    }
  }, []);

  const toggleFavoriteVendor = useCallback((vendorId: string) => {
    setFavoriteVendorIds((prev) => {
      if (prev.includes(vendorId)) {
        return prev.filter((id) => id !== vendorId);
      }
      return [vendorId, ...prev];
    });
  }, []);

  const parseOrderTimestamp = (createdAt?: string, fallback?: string) => {
    const tryParse = (value?: string) => {
      if (!value) return null;
      const direct = Date.parse(value);
      if (!Number.isNaN(direct)) return direct;
      const match = value.match(
        /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/
      );
      if (!match) return null;
      const [, year, month, day, hour = '0', minute = '0'] = match;
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute)
      ).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    };
    return tryParse(createdAt) ?? tryParse(fallback);
  };

  const autoCancelPendingOrders = useCallback(async (sourceOrders: Order[]) => {
    const now = Date.now();
    const expired = sourceOrders.filter((order) => {
      if (order.status !== 'pending-payment') return false;
      const createdAtMs = parseOrderTimestamp(order.createdAt, order.date);
      if (!createdAtMs) return false;
      return now - createdAtMs >= 10 * 60 * 1000;
    });

    if (expired.length === 0) return sourceOrders;

    const updated = await Promise.all(
      expired.map(async (order) => {
        try {
          return await updateOrderStatus(order.id, 'cancelled', '\u8d85\u65f6\u672a\u652f\u4ed8');
        } catch (error) {
          console.warn('Failed to auto-cancel order', order.id, error);
          return order;
        }
      })
    );
    const updatedMap = new Map(updated.map((order) => [order.id, order]));
    return sourceOrders.map((order) => updatedMap.get(order.id) ?? order);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(visitedKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setVisitedVendorIds(parsed.filter((id) => typeof id === 'string'));
        }
      } catch {
        window.localStorage.removeItem(visitedKey);
      }
    }
    setVisitedHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!visitedHydrated) return;
    window.localStorage.setItem(visitedKey, JSON.stringify(visitedVendorIds));
  }, [visitedVendorIds, visitedHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(visitedCacheKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setVisitedVendorCache(parsed as Record<string, Vendor>);
        }
      } catch {
        window.localStorage.removeItem(visitedCacheKey);
      }
    }
    setVisitedCacheHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!visitedCacheHydrated) return;
    window.localStorage.setItem(visitedCacheKey, JSON.stringify(visitedVendorCache));
  }, [visitedVendorCache, visitedCacheHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(favoriteKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoriteVendorIds(parsed.filter((id) => typeof id === 'string'));
        }
      } catch {
        window.localStorage.removeItem(favoriteKey);
      }
    }
    setFavoriteHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!favoriteHydrated) return;
    window.localStorage.setItem(favoriteKey, JSON.stringify(favoriteVendorIds));
  }, [favoriteVendorIds, favoriteHydrated]);

  useEffect(() => {
    if (vendors.length === 0) return;
    setVisitedVendorIds((prev) => prev.filter((id) => vendorById.has(id)));
  }, [vendors, vendorById]);

  useEffect(() => {
    if (vendors.length === 0 || visitedVendorIds.length === 0) return;
    setVisitedVendorCache((prev) => {
      const next = { ...prev };
      visitedVendorIds.forEach((id) => {
        const vendor = vendorById.get(id);
        if (vendor) next[id] = vendor;
      });
      return next;
    });
  }, [vendors, vendorById, visitedVendorIds]);

  useEffect(() => {
    if (vendors.length === 0) return;
    setFavoriteVendorIds((prev) => prev.filter((id) => vendorById.has(id)));
  }, [vendors, vendorById]);

  useEffect(() => {
    if (!selectedVendor) return;
    const next = vendors.find((vendor) => vendor.id === selectedVendor.id);
    if (next && next !== selectedVendor) {
      setSelectedVendor(next);
    }
  }, [vendors, selectedVendor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readCode = () => {
      const url = new URL(window.location.href);
      const searchCode =
        url.searchParams.get('code') ||
        url.searchParams.get('stall') ||
        url.searchParams.get('vendor');
      if (searchCode) return searchCode;
      const hash = window.location.hash || '';
      if (!hash) return null;
      const cleaned = hash.replace(/^#/, '').replace(/^\//, '').replace(/^\?/, '');
      const hashParams = new URLSearchParams(cleaned);
      return (
        hashParams.get('code') ||
        hashParams.get('stall') ||
        hashParams.get('vendor')
      );
    };

    const code = readCode();
    if (code) {
      setPendingVendorCode(code.trim().toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!pendingVendorCode || vendors.length === 0) return;
    const matched = vendors.find(
      (vendor) => vendor.code?.trim().toUpperCase() === pendingVendorCode
    );
    if (matched) {
      setActiveTab('home');
      setSelectedVendor(matched);
      setCurrentView('vendor');
      recordVendorVisit(matched.id, matched);
    } else {
      console.warn(`Vendor code not found: ${pendingVendorCode}`);
    }
    setPendingVendorCode(null);
  }, [pendingVendorCode, vendors, recordVendorVisit]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [vendorData, productData, orderData, configData] = await Promise.all([
        fetchVendors(),
        fetchProducts(),
        fetchOrders(),
        fetchConfig(),
      ]);

      setVendors(vendorData);
      setProducts(productData);
      const nextOrders = await autoCancelPendingOrders(orderData);
      setOrders(nextOrders);
      setDefaultAddress(configData.defaultAddress || null);
      // Save full app config
      setAppConfig({
        enableClientReviews: configData.enableClientReviews !== false,
        showBusinessHours: configData.showBusinessHours !== false,
        showQualifications: configData.showQualifications !== false,
        showContactPhone: configData.showContactPhone !== false,
        showMerchantSlogan: configData.showMerchantSlogan !== false,
        helpCenterTitle: configData.helpCenterTitle || '\u5ba2\u670d\u5728\u7ebf\u65f6\u95f4',
        helpCenterHours: configData.helpCenterHours || '10:00 - 24:00',
        helpCenterContactLabel: configData.helpCenterContactLabel || '\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d',
        helpCenterContactValue: configData.helpCenterContactValue || 'kefu_wechat',
        helpCenterFaqs: normalizeHelpFaqs(configData.helpCenterFaqs),
      });
    } catch (error) {
      console.warn('Failed to load app data', error);
      setLoadError('\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const orderData = await fetchOrders();
      const nextOrders = await autoCancelPendingOrders(orderData);
      setOrders(nextOrders);
      setSelectedOrder((prev) => {
        if (!prev) return prev;
        const next = nextOrders.find((order) => order.id === prev.id);
        return next ?? prev;
      });
    } catch (error) {
      console.warn('Failed to refresh orders', error);
    }
  }, [autoCancelPendingOrders]);

  const refreshCatalog = useCallback(async () => {
    try {
      const [vendorData, productData] = await Promise.all([
        fetchVendors(),
        fetchProducts(),
      ]);
      setVendors(vendorData);
      setProducts(productData);
      setSelectedVendor((prev) => {
        if (!prev) return prev;
        const next = vendorData.find((vendor) => vendor.id === prev.id);
        return next ?? prev;
      });
    } catch (error) {
      console.warn('Failed to refresh catalog', error);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const refresh = async () => {
      if (cancelled) return;
      await refreshOrders();
    };

    if (activeTab === 'order' || currentView === 'orderDetail') {
      void refresh();
      timer = window.setInterval(refresh, 8000);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [activeTab, currentView, refreshOrders]);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const refresh = async () => {
      if (cancelled) return;
      await refreshOrders();
    };

    if (activeTab === 'home' && currentView === 'home') {
      void refresh();
      timer = window.setInterval(refresh, 5000);
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [activeTab, currentView, refreshOrders]);

  useEffect(() => {
    let timer: number | undefined;
    const shouldRefreshCatalog =
      currentView === 'home' || currentView === 'vendor' || currentView === 'orderDetail';

    if (shouldRefreshCatalog) {
      void refreshCatalog();
      timer = window.setInterval(refreshCatalog, 25000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [currentView, refreshCatalog]);

  useBodyScrollLock(isCartOpen);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const root = document.documentElement;
    let baselineHeight = window.innerHeight;

    const updateKeyboardOffset = () => {
      const currentHeight = window.innerHeight;
      if (currentHeight > baselineHeight) {
        baselineHeight = currentHeight;
      }
      const rawOffset = baselineHeight - currentHeight;
      const offset = rawOffset > 120 ? rawOffset : 0;
      root.style.setProperty('--keyboard-offset', `${offset}px`);
      setKeyboardOffset(offset);
    };

    const handleOrientation = () => {
      baselineHeight = window.innerHeight;
      updateKeyboardOffset();
    };

    updateKeyboardOffset();
    window.addEventListener('resize', updateKeyboardOffset);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      window.removeEventListener('resize', updateKeyboardOffset);
      window.removeEventListener('orientationchange', handleOrientation);
      root.style.removeProperty('--keyboard-offset');
    };
  }, []);

  const getTabIndex = () => {
    if (activeTab === 'home') return 0;
    if (activeTab === 'order') return 1;
    if (activeTab === 'user') return 2;
    return 0;
  };

  const handleEnterVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setCurrentView('vendor');
    recordVendorVisit(vendor.id, vendor);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedVendor(null);
  };

  const handleCheckout = () => {
    setIsCartOpen(false); 
    setCurrentView('checkout');
  };

  const handlePaymentSuccess = async (
    mode: 'delivery' | 'dine-in',
    remarks?: Record<string, string>,
    deliveryTime?: string,
    paymentMethod?: string,
    buyerPhone?: string
  ): Promise<{ ok: boolean; message?: string; orders?: Order[] }> => {
    const items = Object.values(cart)
      .filter((cartItem) => cartItem.count > 0)
      .map((cartItem) => ({
        productId: cartItem.product.id,
        count: cartItem.count,
        specs: cartItem.specs,
      }));

    if (items.length === 0) return { ok: false, message: '\u8d2d\u7269\u8f66\u4e3a\u7a7a' };

    let newOrders: Order[] = [];
    try {
      newOrders = await createOrders({ items, mode, remarks, deliveryTime, paymentMethod, buyerPhone });
      setOrders((prev) => [...prev, ...newOrders]);
    } catch (error) {
      console.warn('Failed to create orders', error);
        const message = error instanceof Error && error.message ? error.message : '\u4e0b\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return { ok: false, message };
    }

    setCart({});
    setIsCartOpen(false);
    return { ok: true, orders: newOrders };
  };

  const handlePaymentComplete = () => {
    setCurrentView('home');
    setActiveTab('order');
  };

  const handleOrderStatusUpdate = useCallback(async (
    orderId: string,
    status: Order['status'],
    cancelReason?: string
  ) => {
    try {
      const updated = await updateOrderStatus(orderId, status, cancelReason);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
      setSelectedOrder((prev) => (prev?.id === orderId ? updated : prev));
      return { ok: true, order: updated };
    } catch (error) {
      console.warn('Failed to update order status', error);
      return { ok: false, message: '\u72b6\u6001\u66f4\u65b0\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' };
    }
  }, []);

  const handleMarkPaidFromCheckout = useCallback(async (ordersToUpdate: Order[]) => {
    if (ordersToUpdate.length === 0) {
      return { ok: false, message: '\u6682\u65e0\u53ef\u786e\u8ba4\u7684\u8ba2\u5355' };
    }

    try {
      const results = await Promise.all(
        ordersToUpdate.map((order) => handleOrderStatusUpdate(order.id, 'pending-confirmation'))
      );
      const updatedOrders = results
        .filter((result) => result.ok && result.order)
        .map((result) => result.order as Order);

      if (updatedOrders.length === 0) {
        return { ok: false, message: '\u786e\u8ba4\u652f\u4ed8\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' };
      }

      const targetOrder = updatedOrders[0];
      setSelectedOrder(targetOrder);
      setOrderDetailReturnTab('order');
      setActiveTab('order');
      setCurrentView('orderDetail');
      return { ok: true };
    } catch (error) {
      console.warn('Failed to confirm payment', error);
       return { ok: false, message: '\u786e\u8ba4\u652f\u4ed8\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' };
    }
  }, [handleOrderStatusUpdate]);

  const handleOrderClick = (order: Order) => {
      setSelectedOrder(order);
      setCurrentView('orderDetail');
      setOrderDetailReturnTab(activeTab);
      setReviewTargetOrderId(null);
  };

  const handleOrderReview = (order: Order) => {
      setSelectedOrder(order);
      setCurrentView('orderDetail');
      setOrderDetailReturnTab(activeTab);
      setReviewTargetOrderId(order.id);
  };

  const handleUpdateCart = (product: MenuItem, delta: number, specs: SpecSelection[] = []) => {
    setCart(prev => {
      const stockLimit = product.stockLimit ?? 0;
      if (delta > 0 && stockLimit > 0) {
        const dailySales = product.dailySales ?? 0;
        const available = Math.max(stockLimit - dailySales, 0);
        const currentCount = Object.values(prev)
          .filter(item => item.product.id === product.id)
          .reduce((sum, item) => sum + item.count, 0);
        if (currentCount + delta > available) {
          showToast(`${product.name}\u5e93\u5b58\u4e0d\u8db3\uff0c\u5269\u4f59${available}\u4efd`);
          return prev;
        }
      }
      const uniqueKey = `${product.id}-${specsKey(specs)}`;
      const currentItem = prev[uniqueKey];
      const newCount = (currentItem ? currentItem.count : 0) + delta;
      if (newCount <= 0) { const { [uniqueKey]: _, ...rest } = prev; return rest; }
      return { ...prev, [uniqueKey]: { product, count: newCount, specs } };
    });
  };
  return (
    <div className="min-h-screen bg-[#f1f7f5] flex flex-col font-sans selection:bg-[#e2f3a6] selection:text-[#193b35] overflow-x-hidden">
      {/* Remove the phone frame wrapper; use 100% width/height */}
      <div className="flex-1 relative flex flex-col">
        {(() => {
          switch(currentView) {
            case 'checkout': return (
              <CheckoutView
                cart={cart}
                vendors={vendors}
                defaultAddress={defaultAddress}
                onBack={() => setCurrentView('vendor')}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentComplete={handlePaymentComplete}
                onMarkPaid={handleMarkPaidFromCheckout}
              />
            );
            case 'orderDetail': return selectedOrder ? (
              <OrderDetailView
                order={selectedOrderWithVendorImage ?? selectedOrder}
                onBack={() => {
                  setCurrentView('home');
                  setActiveTab(orderDetailReturnTab);
                }}
                onReorder={(id) => {
                  const vendor = vendorById.get(id);
                  if (vendor) handleEnterVendor(vendor);
                }}
                vendorPhone={vendorById.get(selectedOrder.vendorId)?.phone}
                vendorWechatQr={vendorById.get(selectedOrder.vendorId)?.paymentWechatQr}
                vendorAlipayQr={vendorById.get(selectedOrder.vendorId)?.paymentAlipayQr}
                onRefresh={refreshOrders}
                onUpdateStatus={handleOrderStatusUpdate}
                autoOpenReview={reviewTargetOrderId === selectedOrder.id}
                onAutoOpenReviewHandled={() => setReviewTargetOrderId(null)}
              />
            ) : null;
            case 'vendor': return selectedVendor ? (
              <VendorView
                vendor={selectedVendor}
                products={products}
                cart={cart}
                appConfig={appConfig}
                onBack={handleBackToHome}
                onUpdateCart={handleUpdateCart}
                onOpenCart={() => setIsCartOpen(true)}
                onRefresh={loadData}
                isFavorite={favoriteVendorIds.includes(selectedVendor.id)}
                onToggleFavorite={() => toggleFavoriteVendor(selectedVendor.id)}
              />
            ) : null;
            case 'user-address': return <UserAddressView onBack={() => setCurrentView('home')} />;
            case 'user-favorites': return (
              <UserFavoritesView
                onBack={() => setCurrentView('home')}
                onEnterVendor={handleEnterVendor}
                vendors={favoriteVendors}
              />
            );
            case 'user-coupons': return <UserCouponsView onBack={() => setCurrentView('home')} />;
            case 'user-feedback': return <UserFeedbackView onBack={() => setCurrentView('home')} />;
            case 'user-help': return <UserHelpView onBack={() => setCurrentView('home')} config={appConfig} />;
            default:
              return (
                <>
                  {activeTab === 'home' && (
                    <HomeView 
                      onEnterVendor={handleEnterVendor} 
                      vendors={vendors}
                      visitedVendors={visitedVendors}
                      cart={cart} 
                      isLoading={isLoading}
                      loadError={loadError}
                      onRetry={loadData}
                      onRefresh={loadData}

                      onOpenCart={() => setIsCartOpen(true)} 
                      orders={ordersWithVendorImage}
                      onOrderClick={handleOrderClick}
                      initialScrollTop={homeScrollRef.current}
                      onScrollTopChange={(value) => {
                        homeScrollRef.current = value;
                      }}
                    />
                  )}
                  {activeTab === 'order' && (
                    <OrderListView
                      orders={ordersWithVendorImage}
                      onOrderClick={handleOrderClick}
                      onReview={handleOrderReview}
                      onReorder={(id) => {
                        const vendor = vendorById.get(id);
                        if (vendor) handleEnterVendor(vendor);
                      }}
                      onBrowse={() => setActiveTab('home')}
                      isLoading={isLoading}
                      loadError={loadError}
                      onRetry={loadData}
                      onRefresh={refreshOrders}
                      initialScrollTop={orderScrollRef.current}
                      onScrollTopChange={(value) => {
                        orderScrollRef.current = value;
                      }}
                    />
                  )}
                  {activeTab === 'user' && <UserProfileView onNavigate={(view) => setCurrentView(`user-${view}` as ViewType)} />}

                  {/* 底部导航栏适配 H5 底部 */}
                  <div
                    className="fixed left-6 right-6 h-16 bg-[#f4fbfb] rounded-[28px] flex items-center shadow-[0_12px_30px_rgba(204,232,228,0.6)] z-[60] border border-[#cce8e4] px-2 max-w-[500px] mx-auto transition-transform duration-300"
                    style={{
                      bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
                      transform: keyboardOffset > 0 ? 'translateY(120%)' : 'translateY(0)',
                    }}
                  >
                    <div className="absolute h-12 w-[30.5%] bg-[#cce8e4] rounded-[22px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ left: '0.5rem', transform: `translateX(${getTabIndex() * 108}%)` }}></div>
                    <button onClick={() => { setActiveTab('home'); setCurrentView('home'); }} className={`flex-1 h-full flex items-center justify-center relative z-10 transition-all duration-300 ${activeTab === 'home' ? 'text-[#3a6b63] scale-110' : 'text-[#7fb7ae]'}`}><Home size={26} /></button>
                    <button onClick={() => { setActiveTab('order'); setCurrentView('home'); }} className={`flex-1 h-full flex items-center justify-center relative z-10 transition-all duration-300 ${activeTab === 'order' ? 'text-[#3a6b63] scale-110' : 'text-[#7fb7ae]'}`}><FileText size={26} /></button>
                    <button onClick={() => { setActiveTab('user'); setCurrentView('home'); }} className={`flex-1 h-full flex items-center justify-center relative z-10 transition-all duration-300 ${activeTab === 'user' ? 'text-[#3a6b63] scale-110' : 'text-[#7fb7ae]'}`}><User size={26} /></button>
                  </div>
                </>
              );
          }
        })()}

        <CartDrawer
          cart={cart}
          vendors={vendors}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onUpdateCart={handleUpdateCart}
          onCheckout={handleCheckout}
          onEnterVendor={(vendor) => {
            setIsCartOpen(false);
            handleEnterVendor(vendor);
          }}
        />

        {toastMessage && (
          <div className="fixed inset-x-0 z-[80] flex justify-center pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 90px)' }}>
            <div className="bg-[#193b35] text-[#e2f3a6] text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              {toastMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
