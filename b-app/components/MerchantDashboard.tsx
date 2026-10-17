
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ShoppingBag, Settings, Store, Menu, X, LogOut, Search, Lock, QrCode, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatsPanel } from './StatsPanel';
import { ProductManager } from './ProductManager';
import { OrderManager } from './OrderManager';
import { StoreSettings } from './StoreSettings';
import { IslandBackground } from './Decorations';
import { AppConfig, MenuItem, Merchant, Order } from '../types';
import { getMerchantAuthHeaders } from '../api';

interface Props {
    merchantInfo?: Merchant;
    products: MenuItem[];
    orders: Order[];
    onUpdateProducts: (products: MenuItem[]) => void;
    onUpdateOrder: (order: Order) => void;
    onUpdateMerchant?: (merchantId: string, updates: Partial<Merchant>) => void | Promise<void>;
    onLogout?: () => void;
    config: AppConfig; // 鎺ユ敹閰嶇疆
}

export const MerchantDashboard: React.FC<Props> = ({ merchantInfo, products, orders, onUpdateProducts, onUpdateOrder, onUpdateMerchant, onLogout, config }) => {
  // 瀹氫箟鎵€鏈夎鍥剧被鍨?
  type ViewType = 'stats' | 'products' | 'orders' | 'settings';
  
  const [activeView, setActiveView] = useState<ViewType>('stats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const deriveCategories = (list: MenuItem[]) => {
    const unique = Array.from(new Set(list.map((item) => item.category).filter(Boolean)));
    return unique.length > 0 ? unique : ['招牌', '甜品', '烧烤', '饮品'];
  };

  const [categories, setCategories] = useState<string[]>(
    merchantInfo?.menuCategories?.length ? merchantInfo.menuCategories : deriveCategories(products)
  );
  const [categoriesDirty, setCategoriesDirty] = useState(false);
  const categorySaveTimer = useRef<number | null>(null);
  const categoryStatusTimer = useRef<number | null>(null);
  const [categorySyncStatus, setCategorySyncStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [categorySyncMessage, setCategorySyncMessage] = useState('');
  const merchantLocation =
    (merchantInfo?.locationShort || merchantInfo?.location || '').split(' ')[0];

  const handleUpdateCategories = (nextCategories: string[]) => {
    setCategoriesDirty(true);
    setCategories(nextCategories);
    if (!onUpdateMerchant || !merchantInfo?.id) return;
    setCategorySyncStatus('saving');
    setCategorySyncMessage('分类同步中...');
    if (categorySaveTimer.current) {
      window.clearTimeout(categorySaveTimer.current);
    }
    categorySaveTimer.current = window.setTimeout(() => {
      Promise.resolve().then(() => onUpdateMerchant(merchantInfo.id, { menuCategories: nextCategories }))
        .then(() => {
          setCategorySyncStatus('success');
          setCategorySyncMessage('分类已同步');
        })
        .catch(() => {
          setCategorySyncStatus('error');
          setCategorySyncMessage('分类同步失败');
        })
        .finally(() => {
          if (categoryStatusTimer.current) {
            window.clearTimeout(categoryStatusTimer.current);
          }
          categoryStatusTimer.current = window.setTimeout(() => {
            setCategorySyncStatus('idle');
            setCategorySyncMessage('');
          }, 2000);
        });
    }, 500);
  };

  useEffect(() => {
    setCategoriesDirty(false);
    if (categorySaveTimer.current) {
      window.clearTimeout(categorySaveTimer.current);
      categorySaveTimer.current = null;
    }
    if (categoryStatusTimer.current) {
      window.clearTimeout(categoryStatusTimer.current);
      categoryStatusTimer.current = null;
    }
    setCategorySyncStatus('idle');
    setCategorySyncMessage('');
  }, [merchantInfo?.id]);

  useEffect(() => {
    const remoteCategories = merchantInfo?.menuCategories;
    const isSameCategories = (next: string[], current: string[]) =>
      next.length === current.length && next.every((cat, idx) => cat === current[idx]);

    if (remoteCategories && remoteCategories.length > 0) {
      if (categoriesDirty) {
        if (isSameCategories(remoteCategories, categories)) {
          setCategoriesDirty(false);
        }
        return;
      }
      if (!isSameCategories(remoteCategories, categories)) {
        setCategories(remoteCategories);
      }
      return;
    }

    if (!categoriesDirty) {
      const derived = deriveCategories(products);
      if (!isSameCategories(derived, categories)) {
        setCategories(derived);
      }
    }
  }, [merchantInfo?.menuCategories, products, categoriesDirty, categories]);

  const handleGenerateQrCode = async () => {
    if (!merchantInfo?.id) return;
    setIsGeneratingQr(true);
    try {
      const baseUrl = config.clientBaseUrl?.trim() || window.location.origin;
      const response = await fetch(
        `/api/vendors/${merchantInfo.id}/qrcode?baseUrl=${encodeURIComponent(baseUrl)}&size=400`,
        {
          headers: {
            ...getMerchantAuthHeaders(),
          },
        }
      );
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }
      const data = await response.json();
      setQrCodeData(data.qrDataUrl || '');
      setQrCodeUrl(data.url || baseUrl);
      setIsQrModalOpen(true);
    } catch (error) {
      console.error('Failed to generate QR code', error);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handleDownloadQrCode = () => {
    if (!qrCodeData) return;
    const link = document.createElement('a');
    link.href = qrCodeData;
    link.download = `${merchantInfo?.name || 'stall'}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  
  // 鏍规嵁 config 鍔ㄦ€佺敓鎴?navItems
  const allNavItems = [
    { id: 'stats', label: '经营概况', icon: LayoutDashboard, enabled: config.enableStats },
    { id: 'products', label: '商品管理', icon: Store, enabled: config.enableProducts },
    { id: 'orders', label: '订单处理', icon: ShoppingBag, badge: orders.filter((o) =>
        o.status === 'pending-payment' || o.status === 'pending-confirmation'
      ).length, enabled: config.enableOrders },
    { id: 'settings', label: '店铺设置', icon: Settings, enabled: config.enableSettings },
  ];

  const navItems = allNavItems.filter(item => item.enabled);

  // 鐩戝惉 config 鍙樺寲锛屽鏋滃綋鍓嶉〉闈㈣绂佺敤锛岃嚜鍔ㄨ烦杞埌绗竴涓彲鐢ㄩ〉闈?
  useEffect(() => {
    const currentItem = allNavItems.find(i => i.id === activeView);
    if (currentItem && !currentItem.enabled) {
        if (navItems.length > 0) {
            setActiveView(navItems[0].id as ViewType);
        }
    }
  }, [config, navItems, activeView]);

  // 澶勭悊绯荤粺缁存姢妯″紡
  if (config.systemMaintenance) {
      return (
          <div className="min-h-screen bg-island-bg flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
              <IslandBackground />
              <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[32px] shadow-2xl relative z-10 max-w-md border border-white animate-scale-up">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Lock size={32} className="text-red-500" />
                  </div>
                  <h1 className="text-2xl font-black text-island-dark mb-2">系统维护中</h1>
                  <p className="text-text-secondary mb-8 leading-relaxed">抱歉，平台暂时关闭了商家管理功能进行系统升级或维护。请稍后再试，或联系平台管理员。</p>
                  <button onClick={onLogout} className="w-full py-3 bg-island-dark text-white rounded-xl font-bold">退出登录</button>
              </div>
          </div>
      );
  }

  // 濡傛灉鎵€鏈夊姛鑳介兘琚叧闂?
  if (navItems.length === 0) {
      return (
        <div className="min-h-screen bg-island-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <IslandBackground />
            <div className="text-center relative z-10">
                <div className="text-6xl mb-4">🥥</div>
                <h2 className="text-xl font-bold text-island-dark">暂无可用功能</h2>
                <p className="text-sm text-text-secondary mt-2 mb-6">管理员未为您分配任何权限。</p>
                <button onClick={onLogout} className="px-6 py-2 bg-white rounded-full text-island-dark font-bold shadow-sm">退出</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-island-bg font-sans flex text-island-dark overflow-hidden relative selection:bg-island-primary/20 selection:text-island-dark">
      
      {/* 绉诲姩绔伄缃╁眰 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-island-dark/10 backdrop-blur-[2px] z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-island-dark/30 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white/60 w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-island-dark">摊位二维码</h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-island-dark/60 hover:text-island-dark border border-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            {isGeneratingQr && !qrCodeData ? (
              <div className="text-sm text-island-dark/60 text-center py-10">正在生成二维码...</div>
            ) : qrCodeData ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrCodeData} alt="摊位二维码" className="w-48 h-48 rounded-2xl bg-white shadow-sm" />
                <p className="text-xs text-island-dark/60 text-center break-all">{qrCodeUrl}</p>
                <button
                  onClick={handleDownloadQrCode}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-island-dark text-white text-sm font-bold shadow-sm"
                >
                  <Download size={16} />
                  下载二维码
                </button>
              </div>
            ) : (
              <div className="text-sm text-island-dark/60 text-center py-10">暂无二维码数据</div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar 渚ц竟鏍?*/}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 ${isSidebarCollapsed ? 'w-[92px]' : 'w-[260px]'} bg-island-sidebar flex flex-col p-5 transition-transform duration-300 ease-out shadow-2xl md:shadow-none border-r border-white/50
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 鍏抽棴鎸夐挳 (浠呯Щ鍔ㄧ) */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 text-island-dark/50 hover:text-island-dark md:hidden"
        >
          <X size={24} />
        </button>

        {/* Logo 鍖哄煙 */}
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} mb-6 mt-2 px-2`}>
          <div className="w-10 h-10 rounded-[12px] bg-island-dark flex items-center justify-center text-white font-black text-xl shadow-lg shadow-island-dark/10">
            T
          </div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="text-island-dark font-bold text-lg tracking-wide">滩摊商家</h1>
              <p className="text-island-dark/40 text-[10px] uppercase tracking-widest font-bold">Merchant</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`hidden md:flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} w-full px-3 py-2 mb-6 rounded-full bg-white/60 border border-white shadow-sm text-island-dark/60 hover:text-island-dark transition-colors`}
          title={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          {!isSidebarCollapsed && <span className="text-xs font-bold">收起侧栏</span>}
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* 瀵艰埅鑿滃崟 */}
        <nav className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3.5 rounded-[16px] text-sm font-bold transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-white text-island-dark shadow-soft scale-[1.02]' 
                    : 'text-island-dark/50 hover:bg-white/50 hover:text-island-dark'
                }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                  <item.icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </div>
                {!isSidebarCollapsed && item.badge && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-island-primary/20 text-island-dark' : 'bg-white text-island-dark/60'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isSidebarCollapsed && item.badge && item.badge > 0 && (
                  <span className="absolute top-2 right-3 w-2 h-2 bg-red-400 rounded-full border border-white"></span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 搴曢儴鍟嗘埛淇℃伅 */}
        <div className="pt-6 mt-auto border-t border-island-dark/5">
           <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-2xl bg-white/40 border border-white hover:bg-white transition-all cursor-pointer group shadow-sm`}>
             <img src={merchantInfo?.imageUrl || 'https://via.placeholder.com/100'} className="w-9 h-9 rounded-full object-cover" />
             {!isSidebarCollapsed && (
               <>
                 <div className="flex-1 min-w-0">
                   <h4 className="text-island-dark text-sm font-bold truncate">{merchantInfo?.name || "未知商户"}</h4>
               <p className="text-island-dark/40 text-[10px] font-medium">{merchantInfo?.isOpen ? "营业中" : "休息中"} · {merchantLocation}</p>
                 </div>
                 <button onClick={onLogout} title="退出登录">
                    <LogOut size={16} className="text-island-dark/30 group-hover:text-island-dark transition-colors" />
                 </button>
               </>
             )}
           </div>
           {isSidebarCollapsed && (
             <button
               onClick={onLogout}
               title="退出登录"
               className="mt-3 w-full h-9 rounded-full bg-white/70 border border-white text-island-dark/60 hover:text-island-dark shadow-sm hidden md:flex items-center justify-center"
             >
               <LogOut size={16} />
             </button>
           )}
        </div>
      </div>

      {/* Main Content 鍖哄煙 */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden bg-island-bg">
        
        {/* 椤堕儴閫氭爮 Header */}
        {!isScannerOpen && (
        <div className="h-20 flex items-center justify-between px-6 md:px-10 shrink-0 relative z-20">
           {/* 宸︿晶锛氱Щ鍔ㄧ鑿滃崟 / 闈㈠寘灞戞垨鏍囬 */}
           <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="md:hidden w-10 h-10 bg-white rounded-full flex items-center justify-center text-island-dark shadow-sm border border-gray-100 active:scale-95 transition-transform"
               >
                 <Menu size={20} />
               </button>
             
             {/* 绠€鍗曠殑椤甸潰鏍囬 */}
             <h2 className="text-xl md:text-2xl font-bold text-island-dark tracking-tight hidden md:block">
               {activeView === 'stats' && '经营概况'}
               {activeView === 'products' && '商品管理'}
               {activeView === 'orders' && '订单处理'}
               {activeView === 'settings' && '店铺设置'}
             </h2>
           </div>

           {/* 鍙充晶锛氭悳绱笌閫氱煡 */}
           <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-100/50 hover:border-gray-200 transition-colors group">
               <Search size={16} className="text-gray-400 group-hover:text-island-dark transition-colors" />
               <input 
                 type="text" 
                 placeholder="搴楀唴鎼滅储..." 
                 className="bg-transparent border-none outline-none text-sm ml-2 w-32 md:w-56 placeholder:text-gray-300 text-island-dark" 
               />
             </div>
             
                <button
                  onClick={handleGenerateQrCode}
                  disabled={isGeneratingQr}
                  title="摊位二维码"
                  className={`w-10 h-10 rounded-full bg-white flex items-center justify-center text-island-dark shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors ${isGeneratingQr ? 'opacity-60' : ''}`}
                >
                  <QrCode size={18} />
                </button>
           </div>
        </div>
        
        )}
        {/* 鑳屾櫙锛氭捣宀涢鎯?*/}
        <IslandBackground />

        {/* 鍐呭鍖哄煙 */}
        <div className="flex-1 p-4 md:px-10 md:pb-10 relative z-10 overflow-hidden">
           <div className="max-w-6xl mx-auto h-full">
             {activeView === 'stats' && <StatsPanel products={products} orders={orders} />}
             {activeView === 'products' && (
                 <ProductManager
                    categories={categories}
                    products={products}
                    onUpdateProducts={onUpdateProducts}
                    vendorId={merchantInfo?.id || ''}
                 />
             )}
              {activeView === 'orders' && (
                  <OrderManager 
                     orders={orders}
                     onUpdateOrder={onUpdateOrder}
                     onScannerOpenChange={setIsScannerOpen}
                  />
              )}
             {activeView === 'settings' && (
                  <StoreSettings
                      categories={categories}
                      onUpdateCategories={handleUpdateCategories}
                    products={products} // 浼犻€掑晢鍝佹暟鎹敤浜庨瑙?
                    onUpdateProducts={onUpdateProducts}
                    config={config}
                    merchantInfo={merchantInfo}
                    categorySyncStatus={categorySyncStatus}
                    categorySyncMessage={categorySyncMessage}
                    onUpdateMerchant={(updates) => {
                      if (!merchantInfo?.id) return;
                      return onUpdateMerchant?.(merchantInfo.id, updates);
                    }}
                 />
             )}
           </div>
        </div>
      </div>
    </div>
  );
};




