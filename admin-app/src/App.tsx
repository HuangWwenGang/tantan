import { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { Dashboard } from './components/Dashboard';
import { VendorManager } from './components/VendorManager';
import { ConfigPanel } from './components/ConfigPanel';
import { api } from './api';
import type { Vendor, AppConfig, PlatformStats, CreateVendorRequest, Order } from './types';

type DialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
};

// 纭紪鐮佺鐞嗗憳璐﹀彿锛圡VP闃舵锛?
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'settings'>('overview');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryUrgeCounts, setDeliveryUrgeCounts] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '知道了',
  });
  const [config, setConfig] = useState<AppConfig>({
    enableStats: true,
    enableProducts: true,
    enableOrders: true,
    enableSettings: true,
    systemMaintenance: false,
    enableClientReviews: true,
    showBusinessHours: true,
    showQualifications: true,
    showContactPhone: true,
    showMerchantSlogan: true,
    clientBaseUrl: 'http://localhost:3000',
    helpCenterTitle: '\u5ba2\u670d\u5728\u7ebf\u65f6\u95f4',
    helpCenterHours: '10:00 - 24:00',
    helpCenterContactLabel: '\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d',
    helpCenterContactValue: 'kefu_wechat',
    helpCenterFaqs: [
      { question: '\u53ef\u4ee5\u7528\u73b0\u91d1\u652f\u4ed8\u5417\uFF1F', answer: '\u76ee\u524d\u652f\u6301\u5fae\u4fe1\u548c\u652f\u4ed8\u5b9d\u626b\u7801\u652f\u4ed8\uff0c\u6682\u4e0d\u652f\u6301\u73b0\u91d1\u3002' },
      { question: '\u4e0b\u5355\u540e\u53ef\u4ee5\u53d6\u6d88\u5417\uFF1F', answer: '\u53ef\u4ee5\uff0c\u8bf7\u5728\u672a\u5236\u4f5c\u524d\u53d6\u6d88\uff0c\u8be6\u60c5\u8bf7\u8054\u7cfb\u644a\u4e3b\u3002' },
      { question: '\u5982\u679c\u627e\u4e0d\u5230\u644a\u4f4d\u600e\u4e48\u529e\uFF1F', answer: '\u70b9\u51fb\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d\uff0c\u6216\u62e8\u6253\u5546\u5bb6\u7535\u8bdd\u83b7\u53d6\u5e2e\u52a9\u3002' },
    ],
  });
  const [stats, setStats] = useState<PlatformStats>({
    totalVendors: 0,
    activeVendors: 0,
    openVendors: 0,
    pendingVendors: 0,
    bannedVendors: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    todayRevenue: 0,
    todayOrders: 0,
  });
  const [, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (api.hasAdminToken()) {
      setIsLoggedIn(true);
    }
  }, []);

  // Admin login
  const handleLogin = async (username: string, password: string) => {
    await api.loginAdmin(username, password);
    setIsLoggedIn(true);
  };

  // Logout
  const handleLogout = () => {
    api.clearAdminToken();
    setIsLoggedIn(false);
  };
  const openDialog = (title: string, message: string, confirmLabel = '知道了') => {
    setDialog({ open: true, title, message, confirmLabel });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false }));
  };

  // 鍔犺浇鏁版嵁
  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorData, configData, statsData, orderData, urgeData] = await Promise.all([
        api.getVendors(),
        api.getAppConfig(),
        api.getPlatformStats(),
        api.getOrders(),
        api.getDeliveryUrgeCounts(),
      ]);
      setVendors(vendorData);
      setConfig(configData);
      setStats(statsData);
      setOrders(orderData);
      setDeliveryUrgeCounts(urgeData);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载数据失败';
      console.error('加载数据失败:', error);
      if (message.toLowerCase().includes('authorization')) {
        handleLogout();
        openDialog('登录已过期', '请重新登录');
        return;
      }
      openDialog('加载失败', message);
    } finally {
      setLoading(false);
    }
  };

  // 鍒涘缓鍟嗘埛
  const handleCreateVendor = async (data: CreateVendorRequest) => {
    const newVendor = await api.createVendor(data);
    setVendors((prev) => [...prev, newVendor]);
    await loadData(); // 閲嶆柊鍔犺浇缁熻鏁版嵁
        openDialog('\u5546\u6237\u521b\u5efa\u6210\u529f', `\u5546\u6237\u540d\u79f0: ${newVendor.name}\n\u767b\u5f55\u7801: ${newVendor.code}\n\u521d\u59cb\u5bc6\u7801: ${data.password}\n\u5206\u7c7b: ${newVendor.category}\n\u5730\u5740: ${newVendor.location}\n\n\u8bf7\u5c06\u767b\u5f55\u4fe1\u606f\u63d0\u4f9b\u7ed9\u5546\u6237\uff0c\u5546\u6237\u53ef\u524d\u5f80B\u7aef\u540e\u53f0\uff08\u7aef\u53e33001\uff09\u767b\u5f55\u7ba1\u7406\u3002`);
  };

  // 鏇存柊鍟嗘埛鐘舵€?
  const handleUpdateVendorStatus = async (id: string, status: Vendor['status']) => {
    const updatedVendor = await api.updateVendorStatus(id, status);
    setVendors((prev) => prev.map((v) => (v.id === id ? updatedVendor : v)));
    await loadData(); // 閲嶆柊鍔犺浇缁熻鏁版嵁
  };

  const handleDeleteVendor = async (id: string) => {
    await api.deleteVendor(id);
    setVendors((prev) => prev.filter((vendor) => vendor.id !== id));
    await loadData();
  };

  // 鐢熸垚浜岀淮鐮?
  const handleGenerateQRCode = async (id: string) => {
    // 闇€瑕佹寚瀹欳绔鎴风鐨勮闂湴鍧€
    const configuredBase = (config.clientBaseUrl || '').trim();
    const baseUrl = configuredBase || (typeof window !== 'undefined' ? window.location.origin : '');
    return api.getVendorQRCode(id, baseUrl);
  };

  // 鏇存柊閰嶇疆
  const handleUpdateConfig = async (newConfig: AppConfig) => {
    const updated = await api.updateAppConfig(newConfig);
    setConfig(updated);
  };

  // 鐧诲綍鍚庡姞杞芥暟鎹?
  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  // 鏈櫥褰曟樉绀虹櫥褰曢〉
  if (!isLoggedIn) {
    return (
      <>
        <AdminLogin onLogin={handleLogin} />
        {dialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
            <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-white/60">
              <div className="text-xs font-black tracking-[0.3em] uppercase text-[#193b35]/40">Notice</div>
              <h3 className="text-lg font-bold text-[#193b35] mt-2">{dialog.title}</h3>
              <p className="text-xs text-[#193b35]/70 mt-2 leading-relaxed whitespace-pre-line">
                {dialog.message}
              </p>
              <button
                type="button"
                onClick={closeDialog}
                className="mt-5 w-full h-11 rounded-xl bg-[#193b35] text-[#e2f3a6] text-sm font-bold shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
              >
                {dialog.confirmLabel || '知道了'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 宸茬櫥褰曟樉绀虹鐞嗙晫闈?
  return (
    <>
      <Dashboard
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        stats={stats}
      >
          {activeTab === 'vendors' && (
            <VendorManager
              vendors={vendors}
              orders={orders}
              deliveryUrgeCounts={deliveryUrgeCounts}
              onCreateVendor={handleCreateVendor}
              onUpdateStatus={handleUpdateVendorStatus}
              onGenerateQRCode={handleGenerateQRCode}
              onDeleteVendor={handleDeleteVendor}
            />
          )}
        {activeTab === 'settings' && (
          <ConfigPanel config={config} onUpdate={handleUpdateConfig} />
        )}
      </Dashboard>
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-white/60">
            <div className="text-xs font-black tracking-[0.3em] uppercase text-[#193b35]/40">Notice</div>
            <h3 className="text-lg font-bold text-[#193b35] mt-2">{dialog.title}</h3>
            <p className="text-xs text-[#193b35]/70 mt-2 leading-relaxed whitespace-pre-line">
              {dialog.message}
            </p>
            <button
              type="button"
              onClick={closeDialog}
              className="mt-5 w-full h-11 rounded-xl bg-[#193b35] text-[#e2f3a6] text-sm font-bold shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
            >
              {dialog.confirmLabel || '知道了'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}


