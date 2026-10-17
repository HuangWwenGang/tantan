
import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { 
  ChevronLeft, Phone,
  CheckCircle, Bike, Utensils, XCircle, Star, Copy, Edit3, Store, X, QrCode, Scan, Image as ImageIcon, Clock
} from 'lucide-react';
import { CoconutDrinkIcon, PalmLeafIcon, SunIcon, WholeCoconutIcon } from './Icons';
import { specLabels } from '../utils/specs';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { PullToRefresh } from './PullToRefresh';
import { uploadOrderPaymentProof } from '../services/api';
import QRCode from 'qrcode';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
  onReorder: (vendorId: string) => void;
  vendorPhone?: string;
  vendorWechatQr?: string;
  vendorAlipayQr?: string;
  autoOpenReview?: boolean;
  onAutoOpenReviewHandled?: () => void;
  onRefresh?: () => void | Promise<void>;
  onUpdateStatus?: (
    orderId: string,
    status: Order['status'],
    cancelReason?: string
  ) => Promise<{ ok: boolean; message?: string }>;
}

const SHOW_REVIEW_ACTION = false;
const PROOF_UPLOAD_WINDOW_MS = 10 * 60 * 1000;

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  onBack,
  onReorder,
  vendorPhone,
  vendorWechatQr,
  vendorAlipayQr,
  autoOpenReview = false,
  onAutoOpenReviewHandled,
  onRefresh,
  onUpdateStatus,
}) => {
  const [showQRCode, setShowQRCode] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showPaymentIssue, setShowPaymentIssue] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [proofError, setProofError] = useState('');
  const [proofToast, setProofToast] = useState('');
  const [isProofUploading, setIsProofUploading] = useState(false);
  const [pickupQr, setPickupQr] = useState('');
  const [pickupQrError, setPickupQrError] = useState('');
  const [showPickupSuccess, setShowPickupSuccess] = useState(false);
  const [pendingRemainingMs, setPendingRemainingMs] = useState<number | null>(null);
  const [proofRemainingMs, setProofRemainingMs] = useState<number | null>(null);
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentProofInputRef = useRef<HTMLInputElement | null>(null);
  const proofToastTimerRef = useRef<number | null>(null);
  const hasShownPaymentIssueRef = useRef(false);
  const hasAutoCancelledRef = useRef(false);
  const hasAutoClosedProofRef = useRef(false);
  const paymentIssueSeenKey =
    typeof window !== 'undefined' ? `tantan_payment_issue_seen_${order.id}` : '';
  const proofWindowExpired =
    order.status === 'cancelled' &&
    order.cancelReason === 'payment-not-received' &&
    proofRemainingMs !== null &&
    proofRemainingMs <= 0;

  useBodyScrollLock(showQRCode || showPaymentQR || showPaymentIssue || showReview);

  useEffect(() => {
    if (!autoOpenReview || !SHOW_REVIEW_ACTION) return;
    setShowReview(true);
    onAutoOpenReviewHandled?.();
  }, [autoOpenReview, onAutoOpenReviewHandled]);

  useEffect(() => {
    hasShownPaymentIssueRef.current = false;
    hasAutoCancelledRef.current = false;
    hasAutoClosedProofRef.current = false;
    setProofError('');
    setProofToast('');
    setIsProofUploading(false);
    setProofRemainingMs(null);
    if (proofToastTimerRef.current) {
      window.clearTimeout(proofToastTimerRef.current);
      proofToastTimerRef.current = null;
    }
  }, [order.id]);

  useEffect(() => {
    if (order.status !== 'cancelled') return;
    if (order.cancelReason !== 'payment-not-received') return;
    if (hasShownPaymentIssueRef.current) return;
    if (proofWindowExpired && paymentIssueSeenKey && window.localStorage.getItem(paymentIssueSeenKey) === '1') return;
    hasShownPaymentIssueRef.current = true;
    if (proofWindowExpired && paymentIssueSeenKey) {
      window.localStorage.setItem(paymentIssueSeenKey, '1');
    }
    setShowPaymentIssue(true);
  }, [order.status, order.cancelReason, proofWindowExpired, paymentIssueSeenKey]);

  useEffect(() => {
    if (!showQRCode) return;
    if (order.status !== 'completed') return;
    setShowQRCode(false);
    setShowPickupSuccess(true);
    const timer = window.setTimeout(() => setShowPickupSuccess(false), 1800);
    return () => window.clearTimeout(timer);
  }, [showQRCode, order.status]);

  useEffect(() => {
    if (!showQRCode || !onRefresh) return;
    let timer: number | undefined;
    const refresh = async () => {
      await onRefresh?.();
    };
    void refresh();
    timer = window.setInterval(refresh, 2000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [showQRCode, onRefresh]);

  const reviewTagOptions = ['味道赞', '服务好', '分量足', '包装好', '性价比高'];
  const reviewRatingLabels = ['很差', '不太好', '一般', '满意', '超赞'];

  const isPendingPayment = order.status === 'pending-payment';
  const isPendingConfirmation = order.status === 'pending-confirmation';
  const paymentProofs = Array.isArray(order.paymentProofs) ? order.paymentProofs : [];
  const allowProofUpload =
    isPendingPayment ||
    isPendingConfirmation ||
    (order.status === 'cancelled' && order.cancelReason === 'payment-not-received' && !proofWindowExpired);
  const canUploadProof = allowProofUpload && paymentProofs.length < 2;

  const isPreparing = order.status === 'preparing' || order.status === 'delivering';
  const isReady = order.status === 'ready';
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';
  const normalizedCancelReason =
    order.cancelReason === 'payment-not-received'
      ? '未收到付款'
      : order.cancelReason || '';

  const showHero = (isPreparing || isReady);
  const paymentMethodName = order.paymentMethod || '微信支付';
  const normalizedPaymentMethod = paymentMethodName.toLowerCase();
  const isAlipay = normalizedPaymentMethod.includes('支付宝') || normalizedPaymentMethod.includes('alipay');
  const paymentQr = isAlipay ? vendorAlipayQr : vendorWechatQr;
  const paymentQrTitle = isAlipay ? '支付宝收款码' : '微信收款码';
  const orderNo = (order.orderNo || order.id).slice(-12).toUpperCase();
  const storedBuyerPhone =
    typeof window !== 'undefined' ? window.localStorage.getItem('tantan_buyer_phone') || '' : '';
  const buyerPhoneRaw = order.buyerPhone || order.address?.contactPhone || storedBuyerPhone;
  const buyerPhoneTail = buyerPhoneRaw.replace(/\D/g, '').slice(-4);
  const paymentRemark = buyerPhoneTail || orderNo;
  const pickupPayload = `TTN|${order.vendorId}|${order.id}|${order.pickupCode || ''}`;
  const amount = typeof order.finalTotal === 'number' ? order.finalTotal : order.totalPrice;

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

  const formatCountdown = (valueMs: number) => {
    const totalSeconds = Math.max(0, Math.ceil(valueMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const proofCountdownText = formatCountdown(
    proofRemainingMs !== null ? proofRemainingMs : PROOF_UPLOAD_WINDOW_MS
  );

  useEffect(() => {
    if (!isPendingPayment) {
      setPendingRemainingMs(null);
      return;
    }
    const createdAtMs = parseOrderTimestamp(order.createdAt, order.date);
    if (!createdAtMs) {
      setPendingRemainingMs(null);
      return;
    }
    let active = true;
    const deadlineMs = createdAtMs + 10 * 60 * 1000;

    const tick = async () => {
      if (!active) return;
      const remaining = Math.max(0, deadlineMs - Date.now());
      setPendingRemainingMs(remaining);
      if (remaining > 0) return;
      if (hasAutoCancelledRef.current) return;
      hasAutoCancelledRef.current = true;
      if (!onUpdateStatus) return;
      const result = await onUpdateStatus(order.id, 'cancelled', '超时未支付');
      if (!result.ok) {
        hasAutoCancelledRef.current = false;
        return;
      }
      onRefresh?.();
    };

    void tick();
    const timer = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isPendingPayment, onUpdateStatus, onRefresh, order.createdAt, order.id]);

  useEffect(() => {
    if (order.status !== 'cancelled' || order.cancelReason !== 'payment-not-received') {
      setProofRemainingMs(null);
      return;
    }
    const cancelAtMs = parseOrderTimestamp(order.statusUpdatedAt, order.createdAt || order.date);
    if (!cancelAtMs) {
      setProofRemainingMs(null);
      return;
    }
    let active = true;
    const deadlineMs = cancelAtMs + PROOF_UPLOAD_WINDOW_MS;

    const tick = async () => {
      if (!active) return;
      const remaining = Math.max(0, deadlineMs - Date.now());
      setProofRemainingMs(remaining);
      if (remaining > 0) return;
      if (hasAutoClosedProofRef.current) return;
      hasAutoClosedProofRef.current = true;
      if (!onUpdateStatus) {
        setShowPaymentIssue(false);
        return;
      }
      const result = await onUpdateStatus(order.id, 'cancelled', '未收到付款');
      if (!result.ok) {
        hasAutoClosedProofRef.current = false;
        return;
      }
      setShowPaymentIssue(false);
      onRefresh?.();
    };

    void tick();
    const timer = window.setInterval(tick, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    order.status,
    order.cancelReason,
    order.statusUpdatedAt,
    order.createdAt,
    order.date,
    order.id,
    onUpdateStatus,
    onRefresh,
  ]);

  useEffect(() => {
    if (!showQRCode) return;
    let active = true;
    setPickupQr('');
    setPickupQrError('');
    QRCode.toDataURL(pickupPayload, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!active) return;
        setPickupQr(url);
      })
      .catch(() => {
        if (!active) return;
        setPickupQrError('二维码生成失败，请稍后重试');
      });
    return () => {
      active = false;
    };
  }, [showQRCode, pickupPayload]);

  const formatPrice = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  };

  const handleCopy = async (value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.warn('Failed to copy', error);
    }
  };

  const handleVendorClick = () => {
    onReorder(order.vendorId);
  };

  const statusInfo = (() => {
      if (isPendingPayment) {
          const desc = pendingRemainingMs !== null
            ? `请在${formatCountdown(pendingRemainingMs)}内完成支付`
            : '请在10分钟内完成支付';
          return { title: '待支付', desc, icon: <Clock size={20} className="text-[#b45309]" />, color: 'bg-[#fff7ed]', textColor: 'text-[#b45309]' };
      }
      if (isPendingConfirmation) {
          return { title: '待确认', desc: '等待摊主确认收款', icon: <Clock size={20} className="text-[#2d4f48]" />, color: 'bg-[#e0f2f1]', textColor: 'text-[#2d4f48]' };
      }
      if (isCancelled) {
        const desc = normalizedCancelReason ? `已取消：${normalizedCancelReason}` : '期待您下次光临';
        return { title: '订单已取消', desc, icon: <XCircle size={20} className="text-white" />, color: 'bg-[#e87a5f]', textColor: 'text-white' };
      }
      if (isPreparing) return { title: '制作中', desc: '请留意叫号屏', icon: <Utensils size={20} className="text-[#193b35]" />, color: 'bg-[#193b35]', textColor: 'text-[#e2f3a6]' };
      if (isReady) return { title: '待取餐', desc: '请凭码取餐', icon: <CoconutDrinkIcon className="w-5 h-5 text-[#193b35]" />, color: 'bg-[#e2f3a6]', textColor: 'text-[#193b35]' };
      if (isCompleted) return { title: '已完成', desc: '感谢您的支持', icon: <CheckCircle size={32} className="text-[#193b35]" />, color: 'bg-[#cce8e4]', textColor: 'text-[#193b35]' };
      return { title: '', desc: '', icon: null, color: '', textColor: '' };
  })();

  const toggleReviewTag = (tag: string) => {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const handleSubmitReview = () => {
    setShowReview(false);
    setReviewContent('');
    setReviewTags([]);
    setReviewRating(5);
    setReviewImages([]);
  };

  const handleCloseReview = () => {
    setShowReview(false);
    setReviewContent('');
    setReviewTags([]);
    setReviewRating(5);
    setReviewImages([]);
  };

  const handleReviewImagePick = () => {
    reviewFileInputRef.current?.click();
  };

  const handleReviewImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const remaining = Math.max(0, 3 - reviewImages.length);
    const nextFiles = files.slice(0, remaining);
    Promise.all(
      nextFiles.map((file) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      }))
    ).then((images) => {
      setReviewImages((prev) => [...prev, ...images]);
    });
    event.target.value = '';
  };

  const handlePaymentProofPick = () => {
    if (isProofUploading) return;
    setProofError('');
    paymentProofInputRef.current?.click();
  };

  const handlePaymentProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (paymentProofs.length >= 2) {
      setProofError('最多上传2张凭证');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError('图片过大，请选择5MB以内的图片');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const image = String(reader.result || '');
      if (!image) return;
      setIsProofUploading(true);
      setProofError('');
      try {
        await uploadOrderPaymentProof(order.id, image);
        await onRefresh?.();
        setProofToast('上传成功，等待商家再次核验');
        if (proofToastTimerRef.current) {
          window.clearTimeout(proofToastTimerRef.current);
        }
        proofToastTimerRef.current = window.setTimeout(() => {
          setProofToast('');
          proofToastTimerRef.current = null;
        }, 1600);
      } catch (error) {
        const message = error instanceof Error ? error.message : '上传失败，请稍后再试';
        setProofError(message);
      } finally {
        setIsProofUploading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleOpenPayment = () => {
    setPaymentError('');
    setShowPaymentQR(true);
  };

  const handleClosePaymentIssue = () => {
    if (proofWindowExpired && paymentIssueSeenKey) {
      window.localStorage.setItem(paymentIssueSeenKey, '1');
    }
    setShowPaymentIssue(false);
  };

  const handleMarkPaid = async () => {
    if (isUpdatingStatus) return;
    setPaymentError('');
    if (!onUpdateStatus) {
      setPaymentError('暂时无法更新订单状态');
      return;
    }
    setIsUpdatingStatus(true);
    const result = await onUpdateStatus(order.id, 'pending-confirmation');
    if (!result.ok) {
      setPaymentError(result.message || '状态更新失败，请稍后重试');
      setIsUpdatingStatus(false);
      return;
    }
    setIsUpdatingStatus(false);
    setShowPaymentQR(false);
    onRefresh?.();
  };

  const handleCancelOrder = async () => {
    if (isCancelling) return;
    setCancelError('');
    if (!onUpdateStatus) {
      setCancelError('暂时无法取消订单');
      return;
    }
    setIsCancelling(true);
    const result = await onUpdateStatus(order.id, 'cancelled');
    if (!result.ok) {
      setCancelError(result.message || '取消失败，请稍后重试');
      setIsCancelling(false);
      return;
    }
    setIsCancelling(false);
    setShowPaymentQR(false);
    onRefresh?.();
  };

  return (
    <div className="absolute inset-0 bg-[#f4f9f8] flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 pt-[calc(env(safe-area-inset-top)+6px)] flex items-center justify-between pointer-events-none">
         <button 
            onClick={onBack} 
            aria-label="返回"
            className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-sm pointer-events-auto active:scale-90 transition-transform text-[#193b35]"
         >
            <ChevronLeft size={22} strokeWidth={2.5} />
         </button>
         <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <PullToRefresh
        onRefresh={onRefresh}
        className="flex-1 overflow-y-auto no-scrollbar relative z-0 flex flex-col"
      >
          {showHero ? (
              <div className="w-full h-[45vh] shrink-0 relative">
                   <div className={`w-full h-full relative overflow-hidden flex flex-col items-center justify-center pb-6 sm:pb-0 bg-gradient-to-b ${isReady ? 'from-[#f1f8e9] via-[#dcedc8] to-[#f4f9f8]' : 'from-[#fffde7] via-[#fff9c4] to-[#f4f9f8]'}`}>
                       <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#193b35 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                       <SunIcon className={`absolute top-20 right-10 w-24 h-24 ${isReady ? 'text-[#8bc34a]' : 'text-[#fbc02d]'} opacity-20 animate-[spin_60s_linear_infinite]`} />
                       
                       <div className="relative z-10 flex flex-col items-center mt-4 sm:mt-8">
                           <div className="relative mb-4">
                               <div className={`absolute inset-0 blur-3xl opacity-30 rounded-full transform scale-150 ${isReady ? 'bg-[#aed581]' : 'bg-[#ffe082]'}`}></div>
                               {isReady ? (
                                   <div className="animate-[bounce_2s_infinite]">
                                       <CoconutDrinkIcon className="w-36 h-36 text-[#193b35] drop-shadow-xl relative z-10 transform -rotate-6" />
                                   </div>
                               ) : (
                                   <div className="animate-[pulse_3s_infinite]">
                                       <WholeCoconutIcon className="w-32 h-32 drop-shadow-xl relative z-10" />
                                   </div>
                               )}
                           </div>

                           <div className="text-center">
                               <div className={`text-xs font-black tracking-[0.3em] uppercase mb-1 opacity-60 ${isReady ? 'text-[#33691e]' : 'text-[#b45309]'}`}>Pickup Number</div>
                               <div className={`text-6xl font-heavy tracking-tighter drop-shadow-sm ${isReady ? 'text-[#193b35] scale-110' : 'text-[#193b35]'}`}>
                                  {order.pickupCode}
                               </div>
                           </div>

                           <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border border-white/50 ${statusInfo.color} ${statusInfo.textColor}`}>
                               <div className={isPreparing ? 'bg-[#e2f3a6] rounded-full p-0.5 text-[#193b35]' : ''}>
                                  {statusInfo.icon}
                               </div>
                               <span className="font-heavy text-sm">{statusInfo.title}</span>
                           </div>
                       </div>
                   </div>
              </div>
          ) : (
              <div className="h-24 w-full shrink-0"></div>
          )}

          <div className={`relative px-5 pb-32 w-full transition-transform duration-500 ${showHero ? '-mt-10' : ''}`}>
              {!showHero && (
                  <div className="mb-6 text-center animate-[slideUp_0.4s_ease-out]">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#cce8e4] text-[#193b35] mb-3 shadow-lg">
                          {statusInfo.icon || <Star size={24} />}
                      </div>
                      <h2 className="text-2xl font-heavy text-[#193b35] mb-1">{statusInfo.title}</h2>
                      <p className="text-sm text-[#193b35]/60 font-medium">{statusInfo.desc}</p>
                  </div>
              )}

              <div className="bg-[#fffdfa] w-full rounded-t-[24px] shadow-[0_4px_40px_-10px_rgba(25,59,53,0.1)] relative overflow-hidden animate-[slideUp_0.4s_ease-out_0.1s]">
                  <div className="absolute inset-0 bg-[#193b35]/[0.02] pointer-events-none" style={{ backgroundImage: 'url(\"/cardboard.png\")' }}></div>

                  <div className="p-6 relative">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`进入${order.vendorName}主页`}
                        onClick={handleVendorClick}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleVendorClick();
                          }
                        }}
                        className="group cursor-pointer rounded-2xl -mx-2 px-2 pb-2"
                      >
                      <div className="flex items-center gap-3 pb-4 border-b border-dashed border-[#193b35]/10">
                          <img src={order.vendorImage} className="w-10 h-10 rounded-lg object-cover border border-[#193b35]/10 bg-gray-50" loading="lazy" decoding="async" alt={order.vendorName} />
                          <div className="flex-1">
                              <h3 className="font-heavy text-[#193b35] text-lg leading-tight">{order.vendorName}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                  <span>{order.date}</span>
                                  <span className="w-0.5 h-2 bg-gray-300 rounded-full"></span>
                                  <span>门店自提</span>
                              </div>
                          </div>
                          {vendorPhone ? (
                            <a
                              href={`tel:${vendorPhone}`}
                              aria-label="联系商家"
                              onClick={(event) => event.stopPropagation()}
                              className="w-8 h-8 rounded-full border border-[#193b35]/10 flex items-center justify-center text-[#193b35] hover:bg-[#193b35] hover:text-[#e2f3a6] transition-colors"
                            >
                              <Phone size={14} />
                            </a>
                          ) : (
                            <div
                              aria-label="暂无联系电话"
                              onClick={(event) => event.stopPropagation()}
                              className="w-8 h-8 rounded-full border border-[#193b35]/10 flex items-center justify-center text-[#193b35]/30"
                            >
                              <Phone size={14} />
                            </div>
                          )}
                      </div>

                      <div className="py-4 space-y-5">
                          {order.detailedItems?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center group">
                                  <div className="flex gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shadow-sm">
                                          <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} loading="lazy" decoding="async" />
                                      </div>
                                      <div className="flex flex-col justify-center">
                                          <div className="font-heavy text-[#193b35] text-sm leading-tight mb-1">{item.name}</div>
                                          {item.specs && item.specs.length > 0 && (
                                              <div className="text-[9px] text-[#193b35]/50 font-heavy bg-white px-2 py-0.5 rounded border border-[#193b35]/10 inline-flex items-center justify-center w-fit leading-none">
                                                {specLabels(item.specs).join(' / ')}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="font-heavy text-[#193b35] text-sm">¥{item.price}</div>
                                      <div className="text-[10px] text-[#193b35]/40 font-bold">x{item.count}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      </div>

                      {order.remarks && (
                          <div className="py-3 px-3 bg-[#f4f9f8] rounded-lg mb-2 border border-[#193b35]/5">
                              <div className="flex items-start gap-2">
                                  <Edit3 size={14} className="text-[#193b35]/40 mt-0.5 shrink-0" />
                                  <div>
                                      <span className="text-[10px] font-heavy text-[#193b35] block mb-0.5">订单备注</span>
                                      <p className="text-xs text-[#193b35]/80 leading-relaxed font-medium break-all">{order.remarks}</p>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="pt-4 border-t border-dashed border-[#193b35]/10 space-y-2">
                          <div className="flex justify-between text-xs text-[#193b35]/60 font-medium">
                              <span>打包费</span>
                              <span className="font-bold">￥{order.packagingFee ?? 0}</span>
                          </div>
                          <div className="flex justify-between text-xs text-[#e87a5f] font-medium"><span>优惠</span><span className="font-bold">- ¥0</span></div>
                      </div>

                      <div className="mt-4 pt-4 border-t-2 border-[#193b35]/5 flex justify-between items-end">
                          <div className="text-xs text-[#193b35]/40 font-heavy">实付金额</div>
                          <div className="flex items-baseline gap-1 text-[#193b35]">
                              <span className="text-sm font-heavy">¥</span>
                              <span className="text-3xl font-heavy font-display">{order.totalPrice}</span>
                          </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-dashed border-[#193b35]/10 text-xs space-y-3">
                          <div className="flex justify-between items-center text-[#193b35]/60">
                              <span className="font-medium">订单号</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(orderNo)}
                                className="font-heavy text-[#193b35] flex items-center gap-1 bg-[#f4f9f8] px-1.5 py-0.5 rounded hover:bg-[#eaf5f2]"
                                aria-label="复制订单号"
                              >
                                  {orderNo}
                                  <Copy size={10} className="text-[#193b35]/40 ml-0.5" />
                              </button>
                          </div>
                          <div className="flex justify-between items-center text-[#193b35]/60">
                              <span className="font-medium">联系电话</span>
                              {order.buyerPhone ? (
                                <a
                                  href={`tel:${order.buyerPhone}`}
                                  className="font-heavy text-[#193b35] bg-[#f4f9f8] px-1.5 py-0.5 rounded hover:bg-[#eaf5f2]"
                                >
                                  {order.buyerPhone}
                                </a>
                              ) : (
                                <span className="font-heavy text-[#193b35]/50">未填写</span>
                              )}
                          </div>
                          <div className="flex justify-between items-center text-[#193b35]/60">
                              <span className="font-medium">支付方式</span>
                              <span className="font-heavy text-[#193b35]">{paymentMethodName}</span>
                          </div>
                      </div>

                      <div className="mt-6 bg-[#f4f9f8] rounded-xl p-3 border border-[#193b35]/5">
                          <div className="flex gap-3">
                              <Store size={14} className="text-[#193b35] shrink-0 mt-0.5" />
                              <div>
                                  <div className="text-xs font-heavy text-[#193b35]">取餐地址</div>
                                  <div className="text-[10px] text-[#193b35]/60 mt-0.5 font-medium leading-relaxed">
                                      {order.vendorLocation || '摊位地址信息暂无'}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="h-4 w-full bg-[#f4f9f8] relative z-10" style={{ background: '#f4f9f8', maskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 8px, black 8px)', maskSize: '20px 100%', WebkitMaskImage: 'radial-gradient(circle at 10px 0, transparent 0, transparent 8px, black 8px)', WebkitMaskSize: '20px 20px' }}></div>
              </div>
          </div>
      </PullToRefresh>

      {/* Footer Actions */}
      <div className="relative z-50 bg-white border-t border-gray-100 p-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-5px_20px_rgba(0,0,0,0.02)] shrink-0 rounded-t-[24px]">
           <div className="flex items-center gap-3">
              {isPendingPayment && (
                <>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="flex-1 h-12 bg-white border border-[#193b35]/10 rounded-xl font-heavy text-[#193b35] text-sm hover:bg-[#f4f9f8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? '取消中...' : '取消订单'}
                  </button>
                  <button
                    onClick={handleOpenPayment}
                    className="flex-[1.5] h-12 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
                  >
                    去支付
                  </button>
                </>
              )}
              {isPendingConfirmation && (
                <button className="w-full h-12 bg-[#f1f7f5] text-[#193b35]/60 rounded-xl font-heavy text-sm cursor-not-allowed border border-[#dcece9]">
                    等待商家确认
                </button>
              )}
               {(isCompleted || isCancelled) && (
                   <>
                     {SHOW_REVIEW_ACTION && isCompleted && (
                        <button 
                          onClick={() => setShowReview(true)}
                          className="flex-1 h-12 bg-white border border-[#193b35]/10 rounded-xl font-heavy text-[#193b35] text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Star size={16} className="text-[#e87a5f]" /> 去评价
                        </button>
                     )}
                     <button onClick={() => onReorder(order.vendorId)} className={`${isCompleted ? 'flex-[1.5]' : 'w-full'} h-12 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] active:scale-[0.99] transition-all`}>
                       再来一单
                     </button>
                   </>
               )}
               {isPreparing && (
                   <button className="w-full h-12 bg-[#f1f7f5] text-[#193b35]/60 rounded-xl font-heavy text-sm cursor-not-allowed border border-[#dcece9]">
                       餐品制作中...
                   </button>
               )}
               {isReady && (
                   <button 
                     onClick={() => setShowQRCode(true)}
                     className="w-full h-12 bg-[#e2f3a6] text-[#193b35] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#193b35] active:translate-y-[2px] active:shadow-[2px_2px_0px_#193b35] transition-all border border-[#193b35] flex items-center justify-center gap-2"
                   >
                       <QrCode size={20} />
                       出示取餐码
                   </button>
               )}
           </div>
           {cancelError && (
             <div className="mt-3 text-[11px] font-bold text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca] text-center">
               {cancelError}
             </div>
           )}
      </div>

      {/* Payment Issue Notice */}
      {showPaymentIssue && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8">
               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={handleClosePaymentIssue}></div>

                <div className="relative w-full max-w-[360px] bg-white rounded-[28px] overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh]">
                     <div className="p-6">
                          <div className="text-xs font-black tracking-[0.3em] uppercase text-[#193b35]/40 mb-3">Notice</div>
                          <h3 className="text-lg font-heavy text-[#193b35] mb-2">商家未收到打款</h3>
                          <p className="text-xs text-[#193b35]/60 font-medium leading-relaxed">
                            商家反馈未收到该笔付款。若你已支付，请准备付款记录并联系摊主确认；若未支付，可重新下单完成付款。
                          </p>
                          {!proofWindowExpired && (
                            <div className="mt-2 text-[11px] text-[#193b35]/70 font-bold">
                              请在{proofCountdownText}内上传支付凭证，等待摊主进行二次核验
                            </div>
                          )}

                        {allowProofUpload && (
                          <div className="mt-4 rounded-2xl border border-[#193b35]/10 bg-[#f8fcfb] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                  <div className="text-sm font-heavy text-[#193b35]">上传支付凭证</div>
                                  <div className="text-[11px] text-[#193b35]/60 font-medium mt-1">
                                    上传后可拨打电话联系摊主核实，最多上传2张
                                  </div>
                                </div>
                              <button
                                type="button"
                                onClick={handlePaymentProofPick}
                                disabled={!canUploadProof || isProofUploading}
                                className="h-9 px-4 rounded-xl bg-[#f1f7f5] text-[#193b35] text-xs font-heavy border border-[#193b35]/10 disabled:opacity-50"
                              >
                                {isProofUploading ? '上传中...' : '上传'}
                              </button>
                            </div>

                            {paymentProofs.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {paymentProofs.map((proof, index) => (
                                  <div key={`${proof.url}-${index}`} className="rounded-xl border border-[#193b35]/10 overflow-hidden bg-white">
                                    <img src={proof.url} alt="支付凭证" className="w-full h-16 object-cover" loading="lazy" decoding="async" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {proofError && (
                              <div className="mt-3 text-[11px] font-bold text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca] text-center">
                                {proofError}
                              </div>
                            )}
                          </div>
                        )}

                        {vendorPhone ? (
                          <a
                            href={`tel:${vendorPhone}`}
                            className="mt-4 w-full h-11 bg-[#e2f3a6] text-[#193b35] rounded-xl font-heavy text-sm shadow-[3px_3px_0px_#193b35] active:translate-y-[2px] active:shadow-[1px_1px_0px_#193b35] transition-all border border-[#193b35] flex items-center justify-center"
                          >
                            拨打摊主电话
                          </a>
                        ) : (
                          <div className="mt-4 w-full h-11 bg-[#f1f7f5] text-[#193b35]/50 rounded-xl font-heavy text-sm border border-[#dcece9] flex items-center justify-center">
                            暂无摊主电话
                          </div>
                        )}

                            <button
                                  onClick={() => {
                            handleClosePaymentIssue();
                              onReorder(order.vendorId);
                            }}
                            className="mt-3 w-full h-11 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
                          >
                            重新下单
                          </button>

                          <button
                            onClick={handleClosePaymentIssue}
                            className="mt-3 w-full h-10 text-[#193b35]/60 font-bold text-xs"
                          >
                            知道了
                          </button>
                   </div>
              </div>
          </div>
      )}

      {/* Payment QR Modal */}
      {showPaymentQR && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s]"></div>

              <div className="relative w-full max-w-[380px] bg-white rounded-[28px] overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh]">
                   <div className="p-6 pt-6 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[10px] font-black tracking-[0.3em] uppercase text-[#193b35]/40">{paymentQrTitle}</div>
                            <h3 className="text-lg font-heavy text-[#193b35] mt-2">请扫码支付</h3>
                            <p className="text-[11px] text-[#193b35] font-heavy mt-1">
                              付款时请务必填写备注（手机尾号后 4 位），便于摊主核对
                            </p>
                          </div>
                          <button
                            onClick={() => setShowPaymentQR(false)}
                            aria-label="关闭"
                            className="w-9 h-9 rounded-full bg-[#f1f7f5] text-[#193b35] flex items-center justify-center"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="mt-4 space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                          <div className="rounded-2xl border border-[#193b35]/10 bg-[#f8fcfb] p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-heavy text-[#193b35]">{order.vendorName}</div>
                              <div className="text-[10px] text-[#193b35]/60 font-bold">{paymentMethodName}</div>
                            </div>

                            <div className="mt-2 grid gap-2">
                              <div className="rounded-xl bg-white border border-[#193b35]/10 p-2.5">
                                <div className="text-[10px] text-[#193b35]/60 font-bold">{'\u4ed8\u6b3e\u91d1\u989d\uff08\u9700\u624b\u52a8\u8f93\u5165\uff09'}</div>
                                <div className="mt-0.5 text-lg font-black text-[#193b35]">￥{formatPrice(amount)}</div>
                              </div>
                              <div className="rounded-xl bg-[#f1f7f5] border border-[#193b35]/10 p-2.5 flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-[10px] text-[#193b35]/60 font-bold">{'\u4ed8\u6b3e\u5907\u6ce8\uff08\u624b\u673a\u5c3e\u53f7\u540e 4 \u4f4d\uff09'}</div>
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
                                {paymentQr ? (
                                  <img
                                    src={paymentQr}
                                    alt={paymentQrTitle}
                                    className="w-full h-full object-contain rounded-lg"
                                    style={{ WebkitTouchCallout: 'default', WebkitUserSelect: 'text' }}
                                  />
                                ) : (
                                  <div className="w-full h-full border-[8px] border-[#193b35]/20 rounded-lg flex items-center justify-center px-3 text-center text-[10px] text-[#193b35]/60 font-bold">
                                    商家暂未上传{paymentQrTitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                        {paymentError && (
                          <div className="text-[11px] font-bold text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca] text-center">
                            {paymentError}
                          </div>
                        )}

                        </div>

                        <div className="pt-3 mt-3 border-t border-[#193b35]/10">
                          <button
                            onClick={handleMarkPaid}
                            disabled={isUpdatingStatus}
                            className="w-full h-11 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all disabled:opacity-60 disabled:shadow-none"
                          >
                            {isUpdatingStatus ? '提交中...' : '我已支付'}
                          </button>
                          <button
                            onClick={() => setShowPaymentQR(false)}
                            className="mt-3 w-full h-10 text-[#193b35]/60 font-bold text-xs"
                          >
                            稍后再付
                          </button>
                        </div>
                     </div>
                </div>
            </div>
        )}

      {/* QR Code Nuclear Modal */}
      {showQRCode && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s]" onClick={() => setShowQRCode(false)}></div>
              
              <div className="relative w-full max-w-[320px] bg-white rounded-[32px] overflow-hidden animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] max-h-[85vh]">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-6 bg-black/60 rounded-b-full"></div>
                   
                   <div className="p-8 pt-12 flex flex-col items-center">
                        <div className="text-[#193b35]/40 text-[10px] font-black tracking-[0.3em] uppercase mb-4">Island Entry Ticket</div>
                        
                        <div className="w-full aspect-square bg-[#f8fcfb] rounded-2xl p-6 border-2 border-[#193b35]/5 flex items-center justify-center relative group overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e2f3a6] to-transparent animate-[scan_2s_linear_infinite] z-10 shadow-[0_0_15px_#e2f3a6]"></div>
                             {pickupQr ? (
                               <img
                                 src={pickupQr}
                                 alt="取餐二维码"
                                 className="w-full h-full object-contain bg-white rounded-xl border border-[#193b35]/10"
                               />
                             ) : (
                               <div className="w-full h-full border-[10px] border-[#193b35] rounded-xl flex items-center justify-center px-4 text-center text-xs text-[#193b35]/70 font-bold">
                                 {pickupQrError || '正在生成二维码...'}
                               </div>
                             )}
                        </div>

                        <div className="mt-8 text-center">
                            <h3 className="text-4xl font-heavy text-[#193b35] tracking-tighter mb-1">{order.pickupCode}</h3>
                            <p className="text-xs text-gray-400 font-bold">请摊主扫描此码取餐</p>
                        </div>

                        <div className="mt-8 flex items-center gap-3 w-full p-4 bg-[#f1f7f5] rounded-2xl border border-[#193b35]/5">
                             <img src={order.vendorImage} className="w-10 h-10 rounded-lg object-cover" loading="lazy" decoding="async" alt={order.vendorName} />
                             <div className="flex-1 min-w-0">
                                <div className="text-xs font-black text-[#193b35] truncate">{order.vendorName}</div>
                                <div className="text-[10px] text-gray-400 font-bold">订单核销中...</div>
                             </div>
                             <div className="animate-spin text-[#e2f3a6]">
                                <Scan size={18} />
                             </div>
                        </div>
                   </div>

                   <div className="h-4 w-full bg-[#193b35]/5" style={{ 
                       backgroundImage: 'radial-gradient(circle at 10px 0px, transparent 0, transparent 8px, #fff 8px)', 
                       backgroundSize: '20px 20px',
                       backgroundPosition: '0 0px' 
                    }}></div>
              </div>

              <button 
                onClick={() => setShowQRCode(false)}
                aria-label="关闭"
                className="mt-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
              >
                <X size={24} />
              </button>
          </div>
      )}

      {showPickupSuccess && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6 pointer-events-none">
          <div className="bg-[#193b35] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[fadeIn_0.2s]">
            <CheckCircle size={20} className="text-[#e2f3a6]" />
            <div className="text-sm font-bold">摊主已扫码，核销成功</div>
          </div>
        </div>
      )}

      {proofToast && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6 pointer-events-none">
          <div className="bg-[#193b35] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold animate-[fadeIn_0.2s]">
            {proofToast}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s]" onClick={handleCloseReview}></div>
          <div className="relative w-full max-w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] p-6 pb-6 shadow-2xl animate-[slideUpLarge_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-heavy text-[#193b35]">评价订单</h3>
                <p className="text-xs text-[#193b35]/50 font-medium mt-1">留下你的真实感受</p>
              </div>
              <button 
                onClick={handleCloseReview}
                aria-label="关闭"
                className="w-9 h-9 rounded-full bg-[#f1f7f5] text-[#193b35] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setReviewRating(score)}
                  className="p-1 rounded-full"
                >
                  <Star
                    size={22}
                    className={`${score <= reviewRating ? 'text-[#f4b860] fill-[#f4b860]' : 'text-[#dcece9]'}`}
                  />
                </button>
              ))}
              <span className="text-xs text-[#193b35]/60 font-medium">
                {reviewRatingLabels[reviewRating - 1]}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {reviewTagOptions.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleReviewTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heavy border transition-colors ${
                    reviewTags.includes(tag)
                      ? 'bg-[#cce8e4] text-[#193b35] border-[#193b35]/10'
                      : 'bg-white text-[#193b35]/60 border-[#193b35]/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <div className="flex flex-wrap items-center gap-3">
                {reviewImages.map((src, idx) => (
                  <div key={`${src}-${idx}`} className="w-16 h-16 rounded-xl overflow-hidden border border-[#cce8e4] bg-[#f4f9f8]">
                    <img src={src} alt={`评价图片${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {reviewImages.length < 3 && (
                  <button
                    type="button"
                    onClick={handleReviewImagePick}
                    aria-label="上传图片"
                    className="h-16 px-4 rounded-xl border border-dashed border-[#cce8e4] text-[#3a6b63] text-xs font-heavy bg-[#f4f9f8] flex items-center gap-2 hover:bg-white transition-colors"
                  >
                    <ImageIcon size={16} />
                    上传图片
                  </button>
                )}
              </div>
              <input
                ref={reviewFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleReviewImageChange}
              />
            </div>

            <div className="bg-[#f4f9f8] border border-[#193b35]/10 rounded-2xl p-3">
              <textarea
                value={reviewContent}
                onChange={(event) => setReviewContent(event.target.value)}
                maxLength={200}
                className="w-full h-24 bg-transparent resize-none outline-none text-sm text-[#193b35] placeholder:text-[#193b35]/40 font-medium"
              />
              <div className="text-right text-[10px] text-[#193b35]/40 font-medium">
                {reviewContent.length}/200
              </div>
            </div>

            <button 
              onClick={handleSubmitReview}
              className="mt-5 w-full h-12 bg-[#193b35] text-[#e2f3a6] rounded-xl font-heavy text-sm shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
            >
              提交评价
            </button>
          </div>
        </div>
      )}

      <input
        ref={paymentProofInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePaymentProofChange}
      />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(220px); }
        }
      `}</style>
    </div>
  );
};

