
import React, { useState, useEffect, useCallback } from 'react';
import { MerchantDashboard } from './components/MerchantDashboard';
import { MerchantLogin } from './components/MerchantLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ToastStack, ToastItem } from './components/Toast';
import { AppConfig, Merchant, MenuItem, Order } from './types';
import { api, merchantAuth } from './api';

// --- MOCK GLOBAL DATA ---

const INITIAL_MERCHANTS: Merchant[] = [
  {
    id: 'v1',
    code: '1001',
    name: '大飞海鲜烧烤',
    category: '烧烤',
    status: 'active',
    isOpen: true,
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=200&fit=crop',
    location: '后海村沙滩 3号',
    ownerName: '大飞哥',
    phone: '00000000000',
    revenue: 12580,
  },
  {
    id: 'v2',
    code: '1002',
    name: '阿嬷手打柠檬茶',
    category: '饮品',
    status: 'active',
    isOpen: true,
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&h=200&fit=crop',
    location: '后海村主街 12号',
    ownerName: '林阿嬷',
    phone: '00000000000',
    revenue: 8430,
  },
  {
    id: 'v3',
    code: '1003',
    name: '岛民椰子鸡',
    category: '正餐',
    status: 'banned', // 封禁状态演示
    isOpen: false,
    rating: 3.5,
    imageUrl: 'https://images.unsplash.com/photo-1560155016-bd4879ae8f21?w=200&h=200&fit=crop',
    location: '后海村北村',
    ownerName: '张老板',
    phone: '00000000000',
    revenue: 2100,
  }
];

const INITIAL_PRODUCTS: MenuItem[] = [
  // v1 Products
  {
    id: 'p1', vendorId: 'v1', name: '招牌椰奶清补凉', price: 15, category: '甜品', status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1563583769690-d28163043363?w=300&h=300&fit=crop',
    description: '采用新鲜老椰榨汁，搭配红豆、绿豆、西瓜、芋圆等10种小料。',
    dailySales: 45, stockLimit: 100,
    options: [{ name: '糖度', required: true, choices: [{ label: '标准糖' }, { label: '少糖' }] }]
  },
  {
    id: 'p2', vendorId: 'v1', name: '香辣烤生蚝', price: 38, category: '海岛烧烤', status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop',
    description: '每日新鲜到货，秘制蒜蓉辣酱。', dailySales: 48, stockLimit: 50
  },
  // v2 Products
  {
    id: 'p3', vendorId: 'v2', name: '鸭屎香柠檬茶', price: 18, category: '招牌', status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300&h=300&fit=crop',
    description: '香水柠檬暴打，茶香浓郁。', dailySales: 120, stockLimit: 999
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'o_1001', vendorId: 'v1', vendorName: '大飞海鲜烧烤', vendorImage: '', status: 'pending-payment', orderType: 'delivery',
    itemsSummary: '招牌清补凉 x2', totalPrice: 30, date: '2023-10-26 14:30', count: 2,
    items: [{ name: '招牌清补凉', count: 2, price: 15, imageUrl: 'https://images.unsplash.com/photo-1563583769690-d28163043363?w=100&h=100&fit=crop' }],
    address: { location: '后海村', detail: '冲浪客栈', contactName: '李冲浪', contactPhone: '00000000000' }
  },
  {
    id: 'o_1002', vendorId: 'v2', vendorName: '阿嬷手打柠檬茶', vendorImage: '', status: 'completed', orderType: 'dine-in',
    pickupCode: 'A01', itemsSummary: '柠檬茶 x1', totalPrice: 18, date: '2023-10-26 12:00', count: 1,
    items: [{ name: '鸭屎香柠檬茶', count: 1, price: 18, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=100&h=100&fit=crop' }]
  }
];

export default function App() {
  const sessionKey = 'tantan_b_session';
  // Auth State
  const [userRole, setUserRole] = useState<'merchant' | 'admin' | null>(null);
  const [currentMerchantId, setCurrentMerchantId] = useState<string | null>(null);
  
  // Data Store (The "Database")
  const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS);
  const [products, setProducts] = useState<MenuItem[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  
  // Config
  const [appConfig, setAppConfig] = useState<AppConfig>({
    // B端开关
    enableStats: true,
    enableProducts: true,
    enableOrders: true,
    enableSettings: true,
    systemMaintenance: false,
    
    // C端显示开关
    enableClientReviews: true,
    showBusinessHours: true,
    showQualifications: true,
    showContactPhone: true,
    showMerchantSlogan: true,
    clientBaseUrl: 'http://localhost:3000',
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const orderData = await api.getOrders();
      setOrders(orderData);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(sessionKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { role?: 'merchant' | 'admin'; merchantId?: string | null };
      if (parsed.role === 'merchant') {
        setUserRole('merchant');
        setCurrentMerchantId(parsed.merchantId || null);
      } else if (parsed.role === 'admin') {
        setUserRole('admin');
        setCurrentMerchantId(null);
      }
    } catch {
      window.localStorage.removeItem(sessionKey);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const [config, merchantData, productData] = await Promise.all([
          api.getAppConfig(),
          api.getMerchants(),
          api.getProducts(),
        ]);
        const orderData = userRole === 'merchant' ? await api.getOrders() : [];
        if (!isMounted) return;
        setAppConfig(config);
        setMerchants(merchantData);
        setProducts(productData);
        setOrders(orderData);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setSyncError(error instanceof Error ? error.message : 'Failed to sync');
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userRole]);

  useEffect(() => {
    let timer: number | undefined;
    if (userRole === 'merchant') {
      void refreshOrders();
      timer = window.setInterval(refreshOrders, 3000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [userRole, refreshOrders]);

  useEffect(() => {
    if (userRole !== 'merchant' || !currentMerchantId) return;
    let timer: number | undefined;
    let cancelled = false;

    const refreshOrders = async () => {
      try {
        const orderData = await api.getOrders();
        if (!cancelled) setOrders(orderData);
      } catch (error) {
        console.error(error);
      }
    };

    void refreshOrders();
    timer = window.setInterval(refreshOrders, 3000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [userRole, currentMerchantId]);

  useEffect(() => {
    if (userRole !== 'merchant') return;
    if (merchants.length === 0) return;
    if (!currentMerchantId) {
      setUserRole(null);
      setCurrentMerchantId(null);
      return;
    }
    if (!merchants.some((merchant) => merchant.id === currentMerchantId)) {
      setUserRole(null);
      setCurrentMerchantId(null);
    }
  }, [userRole, currentMerchantId, merchants]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!userRole) {
      window.localStorage.removeItem(sessionKey);
      return;
    }
    window.localStorage.setItem(
      sessionKey,
      JSON.stringify({ role: userRole, merchantId: currentMerchantId })
    );
  }, [userRole, currentMerchantId]);

  // --- Actions ---

  const handleLogin = async (code: string, password: string) => {
    const merchant = await api.loginMerchant(code, password);
    setUserRole('merchant');
    setCurrentMerchantId(merchant.id);
    setMerchants(prev => {
      const exists = prev.some(m => m.id === merchant.id);
      if (exists) {
        return prev.map(m => m.id === merchant.id ? merchant : m);
      }
      return [...prev, merchant];
    });
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentMerchantId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sessionKey);
    }
    merchantAuth.clear();
  };

  // Admin: Impersonate a merchant (Simulate Login)
  const handleImpersonate = (merchantId: string) => {
    setCurrentMerchantId(merchantId);
    setUserRole('merchant');
  };

  // Data Updates Handlers
  const handleUpdateProducts = async (newProducts: MenuItem[]) => {
    if (!currentMerchantId) return;

    const updatedVendorProducts = newProducts.map(p => ({ ...p, vendorId: currentMerchantId }));
    const previousVendorProducts = products.filter(p => p.vendorId === currentMerchantId);
    const previousIds = new Set(previousVendorProducts.map(p => p.id));
    const nextIds = new Set(updatedVendorProducts.map(p => p.id));

    const toCreate = updatedVendorProducts.filter(p => !previousIds.has(p.id));
    const toUpdate = updatedVendorProducts.filter(p => previousIds.has(p.id));
    const toDelete = previousVendorProducts.filter(p => !nextIds.has(p.id));

    setProducts(prev => {
      const otherProducts = prev.filter(p => p.vendorId !== currentMerchantId);
      return [...otherProducts, ...updatedVendorProducts];
    });

    try {
      for (const product of toCreate) {
        await api.createProduct(product);
      }
      for (const product of toUpdate) {
        await api.updateProduct(product.id, product);
      }
      for (const product of toDelete) {
        await api.deleteProduct(product.id);
      }
      const fresh = await api.getProducts();
      setProducts(fresh);
      pushToast('商品已保存', 'success');
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : 'Failed to update products');
      pushToast(error instanceof Error ? error.message : '商品保存失败', 'error');
    }
  };

  const handleUpdateOrders = async (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    try {
      const order = await api.updateOrderStatus(updatedOrder.id, updatedOrder.status, updatedOrder.cancelReason);
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : 'Failed to update order');
    }
  };

  const handleUpdateMerchantStatus = async (merchantId: string, status: Merchant['status']) => {
    setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, status } : m));
    try {
      const merchant = await api.updateMerchant(merchantId, { status });
      setMerchants(prev => prev.map(m => m.id === merchant.id ? merchant : m));
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : 'Failed to update merchant');
    }
  };

  const handleUpdateMerchant = async (merchantId: string, updates: Partial<Merchant>) => {
    setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, ...updates } : m));
    try {
      const merchant = await api.updateMerchant(merchantId, updates);
      setMerchants(prev => prev.map(m => m.id === merchant.id ? merchant : m));
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : 'Failed to update merchant');
      throw error;
    }
  };

  const handleUpdateConfig = async (nextConfig: AppConfig) => {
    setAppConfig(nextConfig);
    try {
      const updated = await api.updateAppConfig(nextConfig);
      setAppConfig(updated);
    } catch (error) {
      console.error(error);
      setSyncError(error instanceof Error ? error.message : 'Failed to update config');
    }
  };

  // --- Derived State for Current View ---
  
  // Filter data for the currently logged-in merchant
  const currentMerchantProducts = products.filter(p => p.vendorId === currentMerchantId);
  const currentMerchantOrders = orders.filter(o => o.vendorId === currentMerchantId);
  const currentMerchantInfo = merchants.find(m => m.id === currentMerchantId);

  return (
    <>
      {userRole === 'merchant' && currentMerchantId && (
        <MerchantDashboard 
          merchantInfo={currentMerchantInfo}
          products={currentMerchantProducts}
          orders={currentMerchantOrders}
          onUpdateProducts={handleUpdateProducts}
          onUpdateOrder={handleUpdateOrders}
          onUpdateMerchant={handleUpdateMerchant}
          onLogout={handleLogout} 
          config={appConfig} 
        />
      )}
      
      {userRole === 'admin' && (
        <AdminDashboard 
          merchants={merchants}
          globalOrders={orders}
          onLogout={handleLogout}
          config={appConfig}
          onUpdateConfig={handleUpdateConfig}
          onImpersonate={handleImpersonate}
          onUpdateMerchantStatus={handleUpdateMerchantStatus}
        />
      )}

      {userRole === null && (
        <MerchantLogin onLogin={handleLogin} />
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
