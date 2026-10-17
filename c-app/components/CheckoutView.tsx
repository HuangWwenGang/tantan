
import React, { useState, useMemo, useEffect } from 'react';
import { CartState, MenuItem, Vendor, Address, SpecSelection, Order } from '../types';
import { calculateItemPrice } from '../utils/pricing';
import { specLabels } from '../utils/specs';
import { 
  ChevronLeft, ChevronRight, Ticket, Bike, Utensils, 
  CreditCard, Wallet, Loader2, MessageSquare, Edit3, X, Copy, Phone
} from 'lucide-react';
import { PalmLeafIcon } from './Icons';
import { getSoldOutProductIds, isVendorClosed } from '../utils/availability';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { recordDeliveryUrge } from '../services/api';

interface CheckoutViewProps {
  cart: CartState;
  vendors: Vendor[];
  defaultAddress?: Address | null;
  onBack: () => void;
  onPaymentSuccess: (
    mode: 'delivery' | 'dine-in',
    remarks: Record<string, string>,
    deliveryTime: string,
    paymentMethod: string,
    buyerPhone: string
  ) => Promise<{ ok: boolean; message?: string; orders?: Order[] }>;
  onPaymentComplete: () => void;
  onMarkPaid: (orders: Order[]) => Promise<{ ok: boolean; message?: string }>;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  vendors,
  defaultAddress,
  onBack,
  onPaymentSuccess,
  onPaymentComplete,
  onMarkPaid,
}) => {
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'dine-in'>('dine-in');
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showUrgeModal, setShowUrgeModal] = useState(false);
  const [isUrgeSubmitting, setIsUrgeSubmitting] = useState(false);
  const [buyerPhone, setBuyerPhone] = useState('');
  const buyerPhoneStorageKey = 'tantan_buyer_phone';
  
  const pickupTime = '尽快取餐';
  const paymentLabel = paymentMethod === 'wechat' ? '微信支付' : '支付宝';

  useBodyScrollLock(showPaymentQR);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(buyerPhoneStorageKey);
    if (stored) setBuyerPhone(stored);
  }, [buyerPhoneStorageKey]);

  // State to hold remarks for each vendor (Key: VendorID, Value: Remark Text)
  const [vendorRemarks, setVendorRemarks] = useState<Record<string, string>>({});

  // --- Grouping Logic ---
  const groupedItems = useMemo(() => {
    const groups: { vendor: Vendor; items: { product: MenuItem; count: number; specs: SpecSelection[] }[] }[] = [];
    Object.values(cart).forEach((cartItem) => {
      if (cartItem.count <= 0) return;
      const { product, count, specs } = cartItem;
      const vendor = vendors.find((item) => item.id === product.vendorId);
      if(!vendor) return;
      
      let group = groups.find(g => g.vendor.id === vendor.id);
      if (!group) {
        group = { vendor, items: [] };
        groups.push(group);
      }
      group.items.push({ product, count, specs });
    });
    return groups;
  }, [cart, vendors]);

  // --- Calculations using Helper ---
  const subtotal = Object.values(cart).reduce((sum, item) => sum + (calculateItemPrice(item.product, item.specs) * item.count), 0);

  const couponDiscount = couponCode ? 8 : 0; // Mock 8元 coupon
  const finalTotal = Math.max(0, subtotal - couponDiscount);
  const isDeliveryIntent = deliveryMode === 'delivery';

  const handleRemarkChange = (vendorId: string, text: string) => {
      setVendorRemarks(prev => ({
          ...prev,
          [vendorId]: text
      }));
  };

  const handleUrge = async () => {
    if (isUrgeSubmitting) return;
    setIsUrgeSubmitting(true);
    try {
      const vendorIds = Array.from(new Set(groupedItems.map((group) => group.vendor.id)));
      await recordDeliveryUrge(vendorIds);
    } catch (error) {
      console.error('Failed to record delivery urge', error);
    } finally {
      setIsUrgeSubmitting(false);
      setShowUrgeModal(true);
    }
  };

  
  const getUnavailableItems = () => {
    const unavailable: { name: string; reason: string }[] = [];
    groupedItems.forEach((group) => {
      const closed = isVendorClosed(group.vendor.businessHours, group.vendor.isOpen !== false);
      const soldOutSet = getSoldOutProductIds(
        group.vendor.id,
        group.items.map((item) => item.product)
      );
      group.items.forEach((item) => {
        if (closed) {
          unavailable.push({ name: item.product.name, reason: '\u5df2\u6253\u70ca' });
        } else if (soldOutSet.has(item.product.id)) {
          unavailable.push({ name: item.product.name, reason: '\u5df2\u552e\u7f44' });
        }
      });
    });
    return unavailable;
  };

  const unavailableItems = useMemo(() => getUnavailableItems(), [groupedItems]);

  const formatPrice = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  };

  const paymentTitle = paymentMethod === 'wechat' ? '微信收款码' : '支付宝收款码';

  const handleCopy = async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.warn("Failed to copy", error);
    }
  };

  const handleBuyerPhoneChange = (value: string) => {
    const sanitized = value.replace(/[^\d]/g, '');
    setBuyerPhone(sanitized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(buyerPhoneStorageKey, sanitized);
    }
  };


  const handlePay = () => {
    if (isPaying) return;
    if (subtotal <= 0) {
      setPayError("????????????");
      return;
    }
    if (deliveryMode === "delivery") {
      setPayError("????????????");
      return;
    }
    if (!buyerPhone) {
      setPayError("??????");
      return;
    }
    if (unavailableItems.length > 0) {
      setPayError("?????????????????");
      return;
    }
    setPayError(null);
    setIsPaying(true);
    void onPaymentSuccess(deliveryMode, vendorRemarks, pickupTime, paymentLabel, buyerPhone)
      .then((result) => {
        if (!result.ok) {
          setPayError(result.message || "??????????");
          return;
        }
        const nextOrders = result.orders ?? [];
        if (nextOrders.length === 0) {
          setPayError("??????????????????");
          return;
        }
        setCreatedOrders(nextOrders);
        setPaymentModalError(null);
        setShowPaymentQR(true);
      })
      .catch(() => {
        setPayError("??????????");
      })
      .finally(() => {
        setIsPaying(false);
      });
  };

  const handleMarkPaid = async () => {
    if (isMarkingPaid) return;
    if (createdOrders.length === 0) {
      setPaymentModalError('暂无可确认的订单');
      return;
    }
    setIsMarkingPaid(true);
    setPaymentModalError(null);
    const result = await onMarkPaid(createdOrders);
    if (!result.ok) {
      setPaymentModalError(result.message || '状态更新失败，请稍后重试');
      setIsMarkingPaid(false);
      return;
    }
    setIsMarkingPaid(false);
    setShowPaymentQR(false);
    setCreatedOrders([]);
  };

  const handleClosePaymentQR = () => {
    setShowPaymentQR(false);
    setCreatedOrders([]);
    setPaymentModalError(null);
    onPaymentComplete();
  };

  return (
    <div className="min-h-screen bg-[#f1f7f5] relative flex flex-col font-sans animate-[slideUp_0.3s_ease-out]">
      
      {/* Background Decoration */}
      <PalmLeafIcon className="absolute top-0 right-0 w-64 h-64 text-[#2d4f48] opacity-5 -rotate-45 pointer-events-none" />

      {/* 1. Header */}
      <div className="relative z-10 p-4 pt-[calc(env(safe-area-inset-top)+12px)] flex items-center justify-between">
         <button onClick={onBack} aria-label="返回" disabled={isPaying} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#193b35] shadow-sm disabled:opacity-50">
            <ChevronLeft size={22} />
         </button>
         <h1 className="text-lg font-heavy text-[#193b35]">确认订单</h1>
         <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className={`flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+200px)] space-y-5 transition-opacity duration-300 ${isPaying ? 'opacity-50 pointer-events-none' : ''}`}>
         
         {/* 2. Delivery/Dine-in Toggle */}
         <div className="bg-[#193b35] p-1.5 rounded-2xl flex relative shadow-[4px_4px_0px_#cce8e4]">
            <button 
               onClick={() => setDeliveryMode('dine-in')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-heavy transition-all duration-300 ${
                  deliveryMode === 'dine-in' 
                  ? 'bg-[#e2f3a6] text-[#193b35] shadow-sm' 
                  : 'text-white/60 hover:text-white'
               }`}
            >
               <Utensils size={16} />
               <span>门店自提/堂食</span>
            </button>
            <button 
               onClick={() => setDeliveryMode('delivery')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-heavy transition-all duration-300 ${
                  deliveryMode === 'delivery' 
                  ? 'bg-[#e2f3a6] text-[#193b35] shadow-sm' 
                  : 'text-white/60 hover:text-white'
               }`}
            >
               <Bike size={16} />
               <span>海滩配送</span>
            </button>
         </div>

         {/* 3. Delivery Prep Notice */}
          {deliveryMode === 'delivery' && (
            <div className="bg-white rounded-[28px] p-6 shadow-sm border border-white space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#cce8e4] text-[#193b35] flex items-center justify-center shadow-sm">
                  <MessageSquare size={20} />
               </div>
               <div>
                 <div className="text-base font-heavy text-[#193b35]">该服务正在筹备中</div>
                  <div className="text-xs text-[#193b35]/60 font-medium mt-1">
                    海滩配送暂未开放，欢迎先选择门店自提/堂食。
                  </div>
                </div>
              </div>
            </div>
          )}

         {!isDeliveryIntent && unavailableItems.length > 0 && (
           <div className="bg-[#f0f7f5] border border-[#cce8e4] rounded-2xl p-4 text-xs text-[#3a6b63] shadow-sm">
             <div className="font-heavy text-[#193b35] mb-2">部分商品暂不可售</div>
             <div className="text-[11px] font-medium text-[#3a6b63]/80">
               {unavailableItems.map((item) => `${item.name} · ${item.reason}`).join(' / ')}
             </div>
           </div>
         )}

         {/* 4. Product Summary (With Remarks per Vendor) */}
         {!isDeliveryIntent && <div className="space-y-4">
            {groupedItems.map(group => (
               <div key={group.vendor.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-white">
                  
                  {/* Vendor Title */}
                  <div className="flex items-center gap-2 mb-4">
                     <img src={group.vendor.imageUrl} className="w-6 h-6 rounded-lg object-cover bg-gray-50 border border-gray-100" loading="lazy" decoding="async" alt={group.vendor.name} />
                     <span className="text-sm font-heavy text-[#193b35]">{group.vendor.name}</span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-4 pl-0">
                     {group.items.map(({product, count, specs}, idx) => {
                        const itemTotal = calculateItemPrice(product, specs) * count;
                        return (
                           <div key={idx} className="flex justify-between items-start">
                              <div className="flex gap-3">
                                 <img src={product.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-gray-50 shrink-0" loading="lazy" decoding="async" alt={product.name} />
                                 <div className="py-0.5">
                                    <div className="text-sm text-[#193b35] font-heavy leading-tight mb-1">{product.name}</div>
                                    {specs.length > 0 && <div className="text-[9px] text-[#193b35]/40 font-heavy bg-[#f4f9f8] px-1.5 py-0.5 rounded border border-[#193b35]/10 inline-flex items-center justify-center w-fit leading-none mb-1">{specLabels(specs).join(' / ')}</div>}
                                    <div className="text-xs text-gray-400 font-medium">x{count}</div>
                                 </div>
                              </div>
                              <div className="text-sm font-heavy font-display text-[#193b35]">¥{itemTotal}</div>
                           </div>
                        );
                     })}
                  </div>

                  {/* --- NEW: REMARK SECTION PER VENDOR --- */}
                  <div className="mt-4 pt-3 border-t border-dashed border-[#193b35]/10">
                      <div className="flex items-start gap-3">
                          <div className="mt-2.5 text-[#193b35]/40 shrink-0">
                              <Edit3 size={16} />
                          </div>
                          <div className="flex-1">
                              <label className="text-[10px] font-heavy text-[#193b35] mb-1.5 block ml-1">订单备注</label>
                              <div className="bg-[#f4f9f8] rounded-xl px-3 py-2.5 transition-colors focus-within:bg-[#eaf5f2] focus-within:ring-1 focus-within:ring-[#193b35]/10">
                                  <textarea 
                                      rows={1}
                                      placeholder="例如：少冰，不加香菜..."
                                      className="w-full bg-transparent text-xs text-[#193b35] placeholder:text-[#193b35]/30 focus:outline-none resize-none align-middle font-medium"
                                      value={vendorRemarks[group.vendor.id] || ''}
                                      onChange={(e) => handleRemarkChange(group.vendor.id, e.target.value)}
                                      onInput={(e) => {
                                          // Auto-grow height slightly if needed
                                          e.currentTarget.style.height = 'auto'; 
                                          e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                      }}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

               </div>
            ))}
         </div>}

         {!isDeliveryIntent && (
           <div className="bg-white rounded-[24px] p-5 shadow-sm border border-white">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-[#193b35] font-heavy text-sm">
                 <Phone size={18} className="text-[#2d4f48]" />
                 联系手机号
               </div>
               <span className="text-[10px] font-heavy text-[#e87a5f]">必填</span>
             </div>
             <div className="bg-[#f4f9f8] rounded-xl px-3 py-3 border border-[#cce8e4] focus-within:ring-1 focus-within:ring-[#193b35]/10">
               <input
                 type="tel"
                 inputMode="numeric"
                 placeholder="请输入手机号"
                 value={buyerPhone}
                 onChange={(event) => handleBuyerPhoneChange(event.target.value)}
                 maxLength={11}
                 className="w-full bg-transparent text-sm text-[#193b35] placeholder:text-[#193b35]/30 focus:outline-none font-medium"
               />
             </div>
             <div className="mt-2 text-[10px] text-[#193b35]/50 font-medium">
               用于联系订单，号码会保存在本机
             </div>
           </div>
         )}

         {/* 5. Coupons & Options */}
         {!isDeliveryIntent && <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-white">
            <button 
               onClick={() => setCouponCode(couponCode ? null : 'ISLAND8')}
               className="w-full flex items-center justify-between p-5 border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
               <div className="flex items-center gap-2 text-[#193b35] font-heavy text-sm">
                  <Ticket size={18} className="text-[#2d4f48]" />
                  优惠券
               </div>
               <div className="flex items-center gap-1">
                  {couponCode ? (
                     <span className="text-[#e87a5f] font-heavy text-sm">- ¥8.00</span>
                  ) : (
                     <span className="text-xs text-gray-400 font-medium">3张可用</span>
                  )}
                  <ChevronRight size={16} className="text-gray-300" />
               </div>
            </button>
            <div className="p-5 flex items-center justify-between">
               <div className="flex items-center gap-2 text-[#193b35] font-heavy text-sm">
                  <Wallet size={18} className="text-[#2d4f48]" />
                  支付方式
               </div>
               <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wechat')}
                    className={`px-3 py-1.5 rounded-full text-xs font-heavy border transition-colors ${
                      paymentMethod === 'wechat'
                        ? 'bg-[#193b35] text-[#e2f3a6] border-[#193b35]'
                        : 'bg-white text-[#193b35]/60 border-[#193b35]/10'
                    }`}
                  >
                    微信
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('alipay')}
                    className={`px-3 py-1.5 rounded-full text-xs font-heavy border transition-colors ${
                      paymentMethod === 'alipay'
                        ? 'bg-[#193b35] text-[#e2f3a6] border-[#193b35]'
                        : 'bg-white text-[#193b35]/60 border-[#193b35]/10'
                    }`}
                  >
                    支付宝
                  </button>
               </div>
            </div>
         </div>}

      </div>

      {/* 6. Bottom Bar */}
      {isDeliveryIntent ? (
        <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-[0_-5px_30px_rgba(0,0,0,0.05)] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] z-20">
          <button
            onClick={handleUrge}
            disabled={isUrgeSubmitting}
            className="w-full h-14 bg-[#193b35] text-[#e2f3a6] rounded-2xl font-heavy text-lg shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all disabled:bg-gray-300 disabled:shadow-none disabled:text-[#193b35]/60"
          >
            {isUrgeSubmitting ? '提交中...' : '催一催'}
          </button>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 w-full bg-white rounded-t-[32px] shadow-[0_-5px_30px_rgba(0,0,0,0.05)] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] z-20">
           {/* Price Breakdown Details (Small) */}
           <div className="mb-4 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                 <span>商品总价</span>
                 <span>￥{subtotal}</span>
              </div>

              {couponCode && (
                 <div className="flex justify-between text-xs text-[#e87a5f] font-medium">
                    <span>优惠抵扣</span>
                    <span>- ￥{couponDiscount}</span>
                 </div>
              )}
           </div>

           {payError && (
              <div className="mb-3 text-xs font-heavy text-[#e87a5f] bg-[#fff3ee] border border-[#f8cbbd] rounded-xl px-3 py-2">
                 {payError}
              </div>
           )}

           <div className="flex items-center gap-4">
              <div className="flex-1">
                 <div className="flex items-baseline gap-1 text-[#193b35]">
                    <span className="text-sm font-heavy">合计</span>
                    <span className="text-3xl font-heavy font-display">￥{finalTotal}</span>
                 </div>
              </div>
              
              <button 
                  onClick={handlePay}
                  disabled={isPaying || subtotal <= 0 || !buyerPhone}
                  className="h-14 px-8 bg-[#193b35] text-[#e2f3a6] rounded-2xl font-heavy text-lg shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all flex items-center gap-2 disabled:bg-gray-300 disabled:shadow-none disabled:text-[#193b35]/60"
              >
                 {isPaying ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                 <span>{isPaying ? '支付中...' : '确认支付'}</span>
              </button>
           </div>
        </div>
      )}

      {showUrgeModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUrgeModal(false)}
          ></div>
          <div className="relative w-full max-w-[320px] bg-white rounded-[24px] p-6 text-center shadow-2xl">
            <div className="text-sm font-heavy text-[#193b35]">
              感谢你支持，我们会尽快准备，早日相见！
            </div>
            <button
              onClick={() => setShowUrgeModal(false)}
              className="mt-5 w-full h-11 rounded-xl bg-[#193b35] text-[#e2f3a6] font-heavy text-sm shadow-[3px_3px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[1px_1px_0px_#2d4f48] transition-all"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {showPaymentQR && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s]"></div>

          <div className="relative w-full max-w-[380px] bg-white rounded-[28px] overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh]">
            <div className="p-6 pt-6 flex flex-col h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black tracking-[0.3em] uppercase text-[#193b35]/40">{paymentTitle}</div>
                  <h3 className="text-lg font-heavy text-[#193b35] mt-2">请扫码支付</h3>
                  <p className="text-[11px] text-[#193b35] font-heavy mt-1">
                    付款时请务必填写备注（手机尾号后 4 位），便于摊主核对
                  </p>
                </div>
                <button
                  onClick={handleClosePaymentQR}
                  aria-label="关闭"
                  className="w-9 h-9 rounded-full bg-[#f1f7f5] text-[#193b35] flex items-center justify-center"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {createdOrders.map((order) => {
                  const vendor = vendors.find((item) => item.id === order.vendorId);
                  const qr =
                    paymentMethod === 'wechat' ? vendor?.paymentWechatQr : vendor?.paymentAlipayQr;
                  const orderNo = (order.orderNo || order.id).slice(-12).toUpperCase();
                  const amount = typeof order.finalTotal === 'number' ? order.finalTotal : order.totalPrice;
                  const buyerPhoneTail = buyerPhone.replace(/\D/g, '').slice(-4);
                  const paymentRemark = buyerPhoneTail || orderNo;

                  return (
                    <div key={order.id} className="rounded-2xl border border-[#193b35]/10 bg-[#f8fcfb] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-heavy text-[#193b35]">{vendor?.name ?? order.vendorName}</div>
                        <div className="text-[10px] text-[#193b35]/60 font-bold">{paymentLabel}</div>
                      </div>

                      <div className="mt-2 grid gap-2">
                        <div className="rounded-xl bg-white border border-[#193b35]/10 p-2.5">
                          <div className="text-[10px] text-[#193b35]/60 font-bold">付款金额（需手动输入）</div>
                          <div className="mt-0.5 text-lg font-black text-[#193b35]">￥{formatPrice(amount)}</div>
                        </div>
                        <div className="rounded-xl bg-[#f1f7f5] border border-[#193b35]/10 p-2.5 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] text-[#193b35]/60 font-bold">付款备注（手机尾号后 4 位）</div>
                            <div className="mt-0.5 text-[14px] font-black text-[#193b35] break-all">{paymentRemark}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentRemark)}
                            className="shrink-0 w-7 h-7 rounded-full border border-[#193b35]/10 text-[#193b35]/70 hover:text-[#193b35] hover:bg-white flex items-center justify-center"
                            aria-label="复制备注尾号"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 w-full rounded-xl border border-[#193b35]/10 bg-white p-2">
                        <div className="mx-auto w-full max-w-[200px] aspect-[4/5] flex items-center justify-center">
                          {qr ? (
                            <img
                              src={qr}
                              alt={paymentTitle}
                              className="w-full h-full object-contain rounded-lg"
                              style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'text' }}
                            />
                          ) : (
                            <div className="w-full h-full border-[8px] border-[#193b35]/20 rounded-lg flex items-center justify-center px-3 text-center text-[10px] text-[#193b35]/60 font-bold">
                              商家暂未上传{paymentTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {paymentModalError && (
                  <div className="text-[11px] font-heavy text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca] text-center">
                    {paymentModalError}
                  </div>
                )}
              </div>
              <div className="pt-3 mt-3 border-t border-[#193b35]/10">
                <button
                  onClick={handleMarkPaid}
                  disabled={isMarkingPaid}
                  className="w-full h-11 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all disabled:opacity-60 disabled:shadow-none"
                >
                  {isMarkingPaid ? '提交中...' : '我已支付'}
                </button>
                <button
                  onClick={handleClosePaymentQR}
                  className="mt-3 w-full h-10 text-[#193b35]/60 font-bold text-xs"
                >
                  稍后再付
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
