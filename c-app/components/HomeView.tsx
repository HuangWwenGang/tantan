
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { 
  MapPin, CoconutIcon, ArrowRight, PalmLeafIcon, 
  HangingCoconutClusterIcon, CoconutDrinkIcon, CoconutTreeIcon, Keyboard, ShoppingBag,
  Grid, X, ChevronRight, Wind, Bike, Utensils
} from './Icons';
import { VendorCard } from './VendorCard';
import { StatePanel } from './StatePanel';
import { Vendor, CartState, Order } from '../types';
import { aiService } from '../services/ai';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { PullToRefresh } from './PullToRefresh';

interface HomeViewProps {
  onEnterVendor: (vendor: Vendor) => void;
  vendors: Vendor[];
  visitedVendors: Vendor[];
  cart: CartState;
  onOpenCart: () => void;
  orders?: Order[];
  onOrderClick?: (order: Order) => void;
  initialScrollTop?: number;
  onScrollTopChange?: (value: number) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
}

const SHOW_VISITED_VENDORS = true;

export const HomeView: React.FC<HomeViewProps> = ({
  onEnterVendor,
  vendors,
  visitedVendors,
  cart,
  onOpenCart,
  orders = [],
  onOrderClick,
  initialScrollTop = 0,
  onScrollTopChange,
  isLoading = false,
  loadError = null,
  onRetry,
  onRefresh,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showAllVendorsModal, setShowAllVendorsModal] = useState(false);
  const [dailyTip, setDailyTip] = useState('椰风习习，正适合吃顿地摊哈！');
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didRestoreRef = useRef(false);

  useBodyScrollLock(showAllVendorsModal);
  
  useEffect(() => {
    const fetchTip = async () => {
      try {
        const tip = await aiService.generateDailyBreeze();
        if (tip) setDailyTip(tip);
      } catch (e) { /* ignore */ }
    };
    fetchTip();
  }, []);

  const formatCityLabel = (value: string) => value.replace(/市$/, '');

  const buildLocationLabel = (address: Record<string, unknown>): string | null => {
    const getText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const value = getText(address[key]);
        if (value) return value;
      }
      return '';
    };

    const cityRaw = pick('city', 'town', 'county', 'state', 'region');
    const districtRaw = pick('city_district', 'state_district', 'district', 'suburb', 'county');
    const city = cityRaw ? formatCityLabel(cityRaw) : '';
    const district = districtRaw;

    if (city && district && city !== district) {
      return `${city} · ${district}`;
    }
    return city || district || null;
  };

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          if (!response.ok) {
            throw new Error('Failed to reverse geocode');
          }
          const data = await response.json();
          const label = buildLocationLabel(data?.address || {});
          if (!label) {
            setLocationLabel(null);
            setLocationStatus('error');
            return;
          }
          setLocationLabel(label);
          setLocationStatus('ready');
        } catch {
          setLocationLabel(null);
          setLocationStatus('error');
        }
      },
      () => {
        setLocationLabel(null);
        setLocationStatus('error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useLayoutEffect(() => {
    if (didRestoreRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    if (initialScrollTop > 0) {
      container.scrollTop = initialScrollTop;
    }
    didRestoreRef.current = true;
  }, [initialScrollTop]);

  const totalCount = Object.values(cart).reduce((a, b) => a + b.count, 0);

  const activeOrders = useMemo(() => {
    const priority: Record<string, number> = {
      ready: 0,
      'pending-confirmation': 1,
      'pending-payment': 2,
      preparing: 3,
      delivering: 4,
    };
    return orders
      .filter((order) => ['pending-payment', 'pending-confirmation', 'preparing', 'ready', 'delivering'].includes(order.status))
      .reverse()
      .map((order, index) => ({ order, index }))
      .sort((a, b) => {
        const pA = priority[a.order.status] ?? 9;
        const pB = priority[b.order.status] ?? 9;
        if (pA !== pB) return pA - pB;
        return a.index - b.index;
      })
      .map(({ order }) => order);
  }, [orders]);

  const PREVIEW_COUNT = 3;
  const hasActiveOrders = activeOrders.length > 0;
  const showEmptyState = SHOW_VISITED_VENDORS && !isLoading && !loadError && !hasActiveOrders && visitedVendors.length === 0;
  const emptyTitle = vendors.length === 0 ? '暂无摊位' : '还没逛过摊位';
  const emptyDescription =
    vendors.length === 0
      ? '附近还没有收录摊位，先走走看看'
      : '逛逛首页或输入摊位码，先去一家试试';
  const locationText =
    locationStatus === 'ready' && locationLabel
      ? locationLabel
      : locationStatus === 'error'
        ? '未获取定位'
        : '定位中';
  
  const displayedItems = useMemo(() => {
    const activeItems = activeOrders.slice(0, PREVIEW_COUNT).map((order) => ({ type: 'order', data: order }));
    const remaining = PREVIEW_COUNT - activeItems.length;
    if (remaining <= 0) return activeItems;
    if (!SHOW_VISITED_VENDORS) return activeItems;

    const activeVendorIds = new Set(activeOrders.map((order) => order.vendorId));
    const orderedVendors = [
      ...visitedVendors.filter((vendor) => !activeVendorIds.has(vendor.id)),
      ...visitedVendors.filter((vendor) => activeVendorIds.has(vendor.id)),
    ];

    const vendorItems = orderedVendors.slice(0, remaining).map((vendor) => ({ type: 'vendor', data: vendor }));
    return [...activeItems, ...vendorItems];
  }, [activeOrders, visitedVendors]);

  const enterVendorByCode = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return false;
    const matched = vendors.find(
      (vendor) => vendor.code?.trim().toUpperCase() === normalized
    );
    if (matched) {
      onEnterVendor(matched);
      return true;
    }
    return false;
  }, [vendors, onEnterVendor]);


  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = inputCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setCodeError('');
    if (!enterVendorByCode(normalizedCode)) {
      setCodeError('摊位码不存在，请检查后重试');
    }
  };




  return (
    <>
      <div className="absolute inset-0 z-10 bg-[#f1f7f5] flex flex-col overflow-hidden overscroll-none">
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#f8fcfb] via-[#f2f9f7] to-[#e8f5f2]"></div>
              <div className="absolute -top-12 -right-12 transform -rotate-12 z-0 scale-125 opacity-30 mix-blend-multiply">
                  <HangingCoconutClusterIcon className="w-72 h-72" />
              </div>
              <div className="absolute bottom-20 -left-20 w-80 h-80 bg-[#dbece9] rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
              <div className="absolute -bottom-16 -right-12 transform rotate-6 opacity-60 grayscale-[0.2]">
                  <CoconutTreeIcon className="w-80 h-80" />
              </div>
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#193b35 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          </div>

          <PullToRefresh
            containerRef={scrollRef}
            onRefresh={onRefresh ?? onRetry}
            className="absolute inset-0 z-10 overflow-y-auto no-scrollbar touch-pan-y overscroll-none"
            onScroll={(event) => onScrollTopChange?.(event.currentTarget.scrollTop)}
          >
              <div className="pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+140px)] px-5 min-h-full flex flex-col">
                {/* Header Area - 降低了 pt，因为没有模拟状态栏了 */}
                <div className="mb-6 animate-[fadeIn_0.5s_ease-out] shrink-0 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                      <div className="bg-[#dcece9] p-1.5 rounded-full backdrop-blur-sm">
                        <MapPin className="text-[#193b35] w-3.5 h-3.5" />
                      </div>
                      <span
                        className="text-[#193b35] text-xs font-bold tracking-wide opacity-80"
                        aria-live="polite"
                      >
                        {locationText}
                      </span>
                  </div>
                  <h1 className="text-[36px] font-heavy text-[#193b35] tracking-tight leading-none mb-1">
                      滩摊 <span className="text-[#2d4f48] text-xl font-normal opacity-40 font-display">TanTan</span>
                  </h1>
                  <p className="text-[#2d4f48] text-sm font-bold mt-1 opacity-50">
                      海风轻拂，寻味地摊
                  </p>
                </div>

                {/* AI Daily Briefing Card */}
                <div className="mb-6 bg-[#e2f3a6]/40 backdrop-blur-sm border border-[#193b35]/5 p-3 rounded-2xl flex items-center gap-3 animate-[fadeIn_0.6s_ease-out_0.2s] relative overflow-hidden">
                   <div className="absolute -right-2 -top-2 opacity-10 rotate-12">
                      <Wind size={40} className="text-[#193b35]" />
                   </div>
                   <div className="w-8 h-8 rounded-full bg-[#193b35] flex items-center justify-center text-[#e2f3a6] shrink-0 shadow-sm">
                      <CoconutIcon className="w-4 h-4" />
                   </div>
                   <p className="text-[11px] font-heavy text-[#193b35]/80 italic">“{dailyTip}”</p>
                </div>

                {/* Main Action Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-[32px] p-6 shadow-[0_15px_40px_-15px_rgba(25,59,53,0.08)] border border-white/60 mb-8 relative overflow-hidden group shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#e0f2f1]/40 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="absolute top-4 right-4 transform rotate-6 opacity-90 drop-shadow-sm grayscale-[0.1]">
                      <CoconutDrinkIcon className="w-20 h-20 text-[#8D6E63]" />
                  </div>
                  <div className="flex items-center justify-between mb-5 relative z-10">
                      <span className="text-xl font-heavy text-[#193b35]">开始点餐</span>
                      <span className="text-xs text-[#193b35]/60 font-bold bg-[#f1f7f5] px-2 py-1 rounded-lg border border-[#e0e7e4]">输入摊位码</span>
                  </div>
                  <form onSubmit={handleManualSubmit} className="relative z-10 w-full bg-[#f4fbf9] rounded-2xl flex items-center p-1.5 shadow-inner border border-[#e0e7e4] transition-transform hover:scale-[1.01]">
                      <div className="pl-3 pr-2 text-[#193b35]/30 shrink-0"><Keyboard size={20} /></div>
                      <input
                        type="text"
                        aria-label="摊位码"
                        className="flex-1 min-w-0 bg-transparent border-none text-2xl font-black text-[#193b35] placeholder-[#193b35]/10 focus:outline-none tracking-widest uppercase h-14"
                        placeholder="T888"
                        value={inputCode}
                        onChange={(e) => {
                          setInputCode(e.target.value);
                          if (codeError) setCodeError('');
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!inputCode.trim()}
                        aria-label="提交摊位码"
                        className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 shadow-sm ${
                          inputCode.trim()
                          ? 'bg-[#cce8e4] text-[#193b35]' 
                          : 'bg-[#e0f2f1] text-[#2d4f48]/40 border border-[#b2ebf2] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <ArrowRight size={24} strokeWidth={3} className="animate-[popIn_0.2s_ease-out]" />
                      </button>
                  </form>
                  {codeError && (
                    <div className="mt-3 text-[11px] font-bold text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca]">
                      {codeError}
                    </div>
                  )}
                </div>

                {/* Dynamic Status / Vendors Section */}
                {(SHOW_VISITED_VENDORS || hasActiveOrders) && (
                  <div className="flex-1 flex flex-col shrink-0">
                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[#193b35] font-heavy text-xl">
                            {SHOW_VISITED_VENDORS ? '去过的摊位' : '进行中的订单'}
                          </h2>
                          {hasActiveOrders && (
                             <span className="bg-[#ff8a65] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                          )}
                        </div>
                        {SHOW_VISITED_VENDORS && visitedVendors.length > 0 && (
                          <button
                            onClick={() => setShowAllVendorsModal(true)}
                            aria-label="查看全部足迹"
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#193b35]/40 active:scale-90"
                          >
                            <ChevronRight size={20} />
                          </button>
                        )}
                    </div>

                    <div className="space-y-3">
                      {SHOW_VISITED_VENDORS ? (
                        loadError ? (
                          <StatePanel
                            variant="error"
                            description={loadError}
                            actionLabel={"重试"}
                            onAction={onRetry}
                          />
                        ) : isLoading ? (
                          <StatePanel variant="loading" />
                        ) : showEmptyState ? (
                          <StatePanel
                            variant="empty"
                            title={emptyTitle}
                            description={emptyDescription}
                          />
                        ) : (
                          displayedItems.map((item, idx) => {
                           if (item.type === 'order') {
                             const order = item.data as Order;
                             const summaryText = order.itemsSummary || order.detailedItems?.map((i) => `${i.name} x${i.count}`).join('、') || '';
                             const statusLabel =
                               order.status === 'ready'
                                 ? '待取餐'
                                 : order.status === 'pending-payment'
                                   ? '待支付'
                                   : order.status === 'pending-confirmation'
                                     ? '待确认'
                                     : '制作中';
                             const statusBadgeClass =
                               order.status === 'ready'
                                 ? 'bg-[#193b35] text-[#e2f3a6]'
                                 : order.status === 'pending-payment'
                                   ? 'bg-[#fff7ed] text-[#b45309]'
                                   : order.status === 'pending-confirmation'
                                     ? 'bg-[#e0f2f1] text-[#2d4f48]'
                                     : 'bg-[#f1f7f5] text-[#193b35]/40';
                             const statusHint =
                               order.status === 'pending-payment'
                                 ? '请完成支付'
                                 : order.status === 'pending-confirmation'
                                   ? '等待商家确认收款'
                                   : (order.status === 'preparing' || order.status === 'delivering')
                                     ? '摊主正在快马加鞭...'
                                     : `预计 ${order.deliveryTime || '15:30'} 可取`;
                             return (
                               <div 
                                 key={`order-${order.id}`}
                                 onClick={() => onOrderClick?.(order)}
                                 className={`cv-auto p-5 rounded-[28px] border transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden ${
                                   order.status === 'ready' 
                                   ? 'bg-[#e2f3a6] border-[#193b35] shadow-[4px_4px_0px_#193b35]' 
                                   : 'bg-white border-white/60 shadow-sm'
                                 }`}
                               >
                                 <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-black/5">
                                   <img src={order.vendorImage} className="w-full h-full object-cover" loading="lazy" decoding="async" alt={order.vendorName} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-sm font-black text-[#193b35] truncate">{order.vendorName}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${statusBadgeClass}`}>
                                        {statusLabel}
                                      </span>
                                   </div>
                                   {order.status === 'ready' ? (
                                     <>
                                       <div className="text-2xl font-black text-[#193b35] tracking-tighter">
                                          取餐码: {order.pickupCode}
                                       </div>
                                       {summaryText && (
                                         <div className="mt-1 text-[11px] text-[#193b35]/60 font-bold truncate">
                                           {summaryText}
                                         </div>
                                       )}
                                     </>
                                   ) : (
                                     <>
                                       <div className="flex items-center gap-2 text-[11px] text-[#193b35]/60 font-bold">
                                          <Utensils size={12} className={order.status === 'pending-payment' || order.status === 'pending-confirmation' ? '' : 'animate-bounce'} />
                                          {statusHint}
                                       </div>
                                       {summaryText && (
                                         <div className="mt-1 text-[11px] text-[#193b35]/50 font-bold truncate">
                                           {summaryText}
                                         </div>
                                       )}
                                     </>
                                   )}
                                 </div>
                                 <ChevronRight size={18} className="text-[#193b35]/30" />
                               </div>
                             );
                           } else {
                             return <VendorCard key={`vendor-${(item.data as Vendor).id}`} vendor={item.data as Vendor} onClick={onEnterVendor} />;
                           }
                          })
                        )
                      ) : (
                        displayedItems.map((item, idx) => {
                          const order = item.data as Order;
                          const summaryText = order.itemsSummary || order.detailedItems?.map((i) => `${i.name} x${i.count}`).join('、') || '';
                          const statusLabel =
                            order.status === 'ready'
                              ? '待取餐'
                              : order.status === 'pending-payment'
                                ? '待支付'
                                : order.status === 'pending-confirmation'
                                  ? '待确认'
                                  : '制作中';
                          const statusBadgeClass =
                            order.status === 'ready'
                              ? 'bg-[#193b35] text-[#e2f3a6]'
                              : order.status === 'pending-payment'
                                ? 'bg-[#fff7ed] text-[#b45309]'
                                : order.status === 'pending-confirmation'
                                  ? 'bg-[#e0f2f1] text-[#2d4f48]'
                                  : 'bg-[#f1f7f5] text-[#193b35]/40';
                          const statusHint =
                            order.status === 'pending-payment'
                              ? '请完成支付'
                              : order.status === 'pending-confirmation'
                                ? '等待商家确认收款'
                                : (order.status === 'preparing' || order.status === 'delivering')
                                  ? '摊主正在快马加鞭...'
                                  : `预计 ${order.deliveryTime || '15:30'} 可取`;
                          return (
                            <div 
                              key={`order-${order.id}`}
                              onClick={() => onOrderClick?.(order)}
                              className={`cv-auto p-5 rounded-[28px] border transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden ${
                                order.status === 'ready' 
                                ? 'bg-[#e2f3a6] border-[#193b35] shadow-[4px_4px_0px_#193b35]' 
                                : 'bg-white border-white/60 shadow-sm'
                              }`}
                            >
                              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-black/5">
                                <img src={order.vendorImage} className="w-full h-full object-cover" loading="lazy" decoding="async" alt={order.vendorName} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                   <span className="text-sm font-black text-[#193b35] truncate">{order.vendorName}</span>
                                   <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${statusBadgeClass}`}>
                                     {statusLabel}
                                   </span>
                                </div>
                                {order.status === 'ready' ? (
                                  <>
                                    <div className="text-2xl font-black text-[#193b35] tracking-tighter">
                                       取餐码: {order.pickupCode}
                                    </div>
                                    {summaryText && (
                                      <div className="mt-1 text-[11px] text-[#193b35]/60 font-bold truncate">
                                        {summaryText}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 text-[11px] text-[#193b35]/60 font-bold">
                                       <Utensils size={12} className={order.status === 'pending-payment' || order.status === 'pending-confirmation' ? '' : 'animate-bounce'} />
                                       {statusHint}
                                    </div>
                                    {summaryText && (
                                      <div className="mt-1 text-[11px] text-[#193b35]/50 font-bold truncate">
                                        {summaryText}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              <ChevronRight size={18} className="text-[#193b35]/30" />
                            </div>
                          );
                        })
                      )}
                    </div>

                    {SHOW_VISITED_VENDORS && visitedVendors.length > PREVIEW_COUNT && (
                        <div className="mt-4 flex justify-center">
                            <button onClick={() => setShowAllVendorsModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/60 backdrop-blur border border-white text-[#193b35] text-sm font-black shadow-sm active:scale-95">
                               <Grid size={18} />
                               <span>查看全部足迹 ({visitedVendors.length})</span>
                            </button>
                        </div>
                    )}
                  </div>
                )}
              </div>
          </PullToRefresh>

          {totalCount > 0 && (
            <button
              onClick={onOpenCart}
              aria-label="打开购物车"
              className="fixed right-6 z-50 w-16 h-16 bg-[#cce8e4] rounded-full flex flex-col items-center justify-center text-[#3a6b63] shadow-lg animate-[popIn_0.3s_ease-out] border-4 border-white"
              style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
            >
              <div className="relative">
                <ShoppingBag size={24} />
                <div className="absolute -top-2 -right-2 bg-[#8ed6d6] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{totalCount}</div>
              </div>
            </button>
          )}
      </div>

      {SHOW_VISITED_VENDORS && showAllVendorsModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAllVendorsModal(false)}></div>
            <div className="relative z-10 bg-[#f1f7f5] w-full max-w-[600px] max-h-[82vh] rounded-t-[32px] flex flex-col animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-[#193b35]/5 bg-white/80 shrink-0">
                   <div className="flex items-center gap-2">
                      <Grid size={22} className="text-[#193b35]" />
                      <h2 className="text-xl font-heavy text-[#193b35]">所有足迹</h2>
                   </div>
                   <button onClick={() => setShowAllVendorsModal(false)} aria-label="关闭" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#193b35]"><X size={22} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-3 overscroll-contain no-scrollbar">
                   {visitedVendors.length === 0 ? (
                     <StatePanel
                       variant="empty"
                       title={emptyTitle}
                       description={emptyDescription}
                     />
                   ) : (
                     <>
                       {visitedVendors.map((vendor) => (
                         <VendorCard
                           key={vendor.id}
                           vendor={vendor}
                           onClick={(v) => {
                             onEnterVendor(v);
                             setShowAllVendorsModal(false);
                           }}
                         />
                       ))}
                       <div className="text-center py-10 opacity-40"><p className="text-xs font-bold text-[#193b35]">到底啦 ~</p></div>
                     </>
                   )}
                </div>
            </div>
        </div>
      )}

      <style>{`
        @keyframes slideRight {
          0% { transform: translateX(-5px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(10px); opacity: 0; }
        }
      `}</style>
    </>
  );
};

