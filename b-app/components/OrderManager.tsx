
import React, { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, Phone, CheckCircle, User, Bike, MessageSquareText, ScanLine, X, Check, Search, ChevronLeft } from 'lucide-react';
import type { BrowserQRCodeReader } from '@zxing/browser';
import { Order } from '../types';

// --- Audio Helper ---
const playSound = (type: 'scan' | 'success') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'scan') {
            // Beep: 清脆的扫码声
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else {
            // Success: 愉悦的和弦音
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

// --- Verification Summary Modal ---
interface VerificationModalProps {
    order: Order;
    onConfirm: () => void;
    onCancel: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ order, onConfirm, onCancel }) => {
    const paymentLabel = order.paymentMethod || '微信支付';
    const orderTime = order.date || '--';
    const orderIdShort = order.id.slice(-12).toUpperCase();
    const contactPhone = order.buyerPhone || order.address?.contactPhone || '';

    return (
        <div className="fixed inset-0 z-[140] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-md bg-white rounded-[28px] overflow-hidden shadow-2xl animate-scale-up">
                <div className="relative bg-island-dark text-white px-6 pt-6 pb-9">
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
                    >
                        <X size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-3">
                        <ScanLine size={18} />
                    </div>
                    <h2 className="text-lg font-bold">核销订单确认</h2>
                    <p className="text-xs text-white/70 mt-1">请核对顾客餐品信息</p>
                </div>

                <div
                    className="h-4 w-full"
                    style={{
                        backgroundColor: '#ffffff',
                        backgroundImage:
                            'radial-gradient(circle at 10px 0px, #193b35 0 8px, transparent 9px)',
                        backgroundSize: '20px 18px',
                        backgroundPosition: '0 0px',
                    }}
                ></div>

                <div className="px-6 py-6">
                    <div className="text-center mb-5">
                        <div className="text-xs text-text-secondary font-bold tracking-[0.2em]">取餐码</div>
                        <div className="text-4xl font-english font-black text-island-dark tracking-widest mt-1">
                            {order.pickupCode || '--'}
                        </div>
                    </div>

                    <div className="bg-[#f8fbfa] rounded-2xl border border-[#193b35]/10 px-4 py-4">
                        <div className="text-xs font-bold text-[#193b35] mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#e2f3a6] text-[#193b35] flex items-center justify-center">
                                <CheckCircle size={14} />
                            </span>
                            餐品清单
                        </div>
                        <div className="space-y-3 max-h-[210px] overflow-y-auto no-scrollbar">
                            {order.items.map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-xl bg-white border border-[#193b35]/10 overflow-hidden flex items-center justify-center shrink-0">
                                            {item.imageUrl ? (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#edf4f2]" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-island-dark font-bold truncate">{item.name}</div>
                                            {item.specs && item.specs.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.specs.map((spec, specIdx) => (
                                                        <span
                                                            key={`${spec}-${specIdx}`}
                                                            className="px-2 py-0.5 rounded-full bg-white border border-[#193b35]/15 text-[10px] text-[#193b35]/70 font-bold"
                                                        >
                                                            {spec}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-island-dark font-english font-bold">x{item.count}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#193b35]/10 text-xs text-[#193b35]/60 space-y-1">
                            <div className="flex justify-between">
                                <span>下单时间</span>
                                <span className="font-bold text-[#193b35]">{orderTime}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>支付方式</span>
                                <span className="font-bold text-[#193b35]">{paymentLabel}</span>
                            </div>
                            {contactPhone && (
                                <div className="flex justify-between">
                                    <span>联系电话</span>
                                    <span className="font-bold text-[#193b35]">{contactPhone}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>订单号</span>
                                <span className="font-english font-bold text-[#193b35]">{orderIdShort}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-[14px] border border-gray-200 text-gray-500 font-bold text-sm"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-[1.4] py-3 rounded-[14px] bg-island-dark text-white font-bold text-sm shadow-lg shadow-island-dark/20 flex items-center justify-center gap-2"
                    >
                        <Check size={16} className="stroke-[3]" />
                        确认核销
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Scanner Component ---
interface ScannerProps {
    onClose: () => void;
    onScanSuccess: (pickupCode: string) => { ok: boolean; message?: string };
}

const ScannerModal: React.FC<ScannerProps> = ({ onClose, onScanSuccess }) => {
    const [scanState, setScanState] = useState<'scanning' | 'success'>('scanning');
    const [error, setError] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanTimerRef = useRef<number | null>(null);
    const detectorRef = useRef<any>(null);
    const zxingReaderRef = useRef<BrowserQRCodeReader | null>(null);
    const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
    const handlingRef = useRef(false);

    const handleClose = (event?: React.MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        onClose();
    };

    const handleDetected = (rawValue: string) => {
        if (handlingRef.current) return;
        handlingRef.current = true;
        playSound('scan');
        setScanState('success');

        setTimeout(() => {
            const result = onScanSuccess(rawValue);
            if (result.ok) {
                onClose();
                return;
            }
            setScanState('scanning');
            setError(result.message || '未找到该取餐码的订单');
            handlingRef.current = false;
        }, 700);
    };

    useEffect(() => {
        let cancelled = false;

        const cleanup = () => {
            if (scanTimerRef.current) {
                window.clearInterval(scanTimerRef.current);
            }
            if (zxingControlsRef.current) {
                try {
                    zxingControlsRef.current.stop();
                } catch {
                    // ignore stop errors
                }
                zxingControlsRef.current = null;
            }
            if (zxingReaderRef.current) {
                try {
                    const reader = zxingReaderRef.current as { reset?: () => void };
                    if (typeof reader.reset === 'function') {
                        reader.reset();
                    }
                } catch {
                    // ignore reset errors
                }
                zxingReaderRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => {
                    try {
                        track.stop();
                    } catch {
                        // ignore track stop errors
                    }
                });
                streamRef.current = null;
            }
        };

        const attachStreamToVideo = (stream: MediaStream) => {
            if (!videoRef.current) return;
            const videoEl = videoRef.current;
            videoEl.setAttribute('playsinline', 'true');
            videoEl.setAttribute('webkit-playsinline', 'true');
            videoEl.muted = true;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.srcObject = stream;
            const markReady = () => setIsCameraReady(true);
            videoEl.onloadedmetadata = markReady;
            videoEl.oncanplay = markReady;
            videoEl.onplaying = markReady;
            const playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => undefined);
            }
        };

        const startCamera = async () => {
            setCameraError('');
            if (typeof window !== 'undefined' && !window.isSecureContext) {
                setCameraError('需使用 HTTPS 或本机 localhost 才能打开摄像头');
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError('当前浏览器不支持摄像头');
                return;
            }

            const Detector = (window as any).BarcodeDetector;
            const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
            if (Detector && !isIOS) {
                try {
                    const baseConstraints = {
                        video: {
                            facingMode: { ideal: 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                        audio: false,
                    };
                    let stream: MediaStream;
                    if (isIOS) {
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: {
                                    facingMode: { exact: 'environment' },
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 },
                                },
                                audio: false,
                            });
                        } catch {
                            stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
                        }
                    } else {
                        stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
                    }
                    if (cancelled) {
                        stream.getTracks().forEach((track) => track.stop());
                        return;
                    }
                    streamRef.current = stream;
                    attachStreamToVideo(stream);
                    detectorRef.current = new Detector({ formats: ['qr_code'] });
                    if (scanTimerRef.current) {
                        window.clearInterval(scanTimerRef.current);
                    }
                    scanTimerRef.current = window.setInterval(async () => {
                        if (!videoRef.current || scanState !== 'scanning' || handlingRef.current) return;
                        try {
                            const barcodes = await detectorRef.current.detect(videoRef.current);
                            if (barcodes && barcodes.length > 0) {
                                const value = barcodes[0].rawValue || barcodes[0].value;
                                if (value) {
                                    handleDetected(value);
                                }
                            }
                        } catch {
                            // ignore scan errors
                        }
                    }, 400);
                } catch {
                    setCameraError('无法打开摄像头，请检查权限');
                }
                return;
            }

            // ZXing fallback for browsers without BarcodeDetector
            try {
                if (!videoRef.current) {
                    setCameraError('摄像头初始化失败，请刷新重试');
                    return;
                }
                const { BrowserQRCodeReader } = await import('@zxing/browser');
                const reader = new BrowserQRCodeReader();
                zxingReaderRef.current = reader;
                if (isIOS) {
                    let stream: MediaStream;
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: 'environment' },
                            audio: false,
                        });
                    } catch {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: false,
                        });
                    }
                    if (cancelled) {
                        stream.getTracks().forEach((track) => track.stop());
                        return;
                    }
                    streamRef.current = stream;
                    attachStreamToVideo(stream);
                    const controls = await reader.decodeFromStream(
                        stream,
                        videoRef.current,
                        (result) => {
                            if (result?.getText()) {
                                handleDetected(result.getText());
                            }
                        }
                    );
                    if (cancelled) {
                        controls.stop();
                        return;
                    }
                    zxingControlsRef.current = controls;
                    setIsCameraReady(true);
                    return;
                }
                const devices = await BrowserQRCodeReader.listVideoInputDevices();
                const preferred = devices.find((device) =>
                    /back|rear|environment/i.test(device.label)
                );
                const videoEl = videoRef.current;
                videoEl.muted = true;
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.setAttribute('playsinline', 'true');
                videoEl.setAttribute('webkit-playsinline', 'true');
                const controls = await reader.decodeFromVideoDevice(
                    preferred?.deviceId,
                    videoEl,
                    (result) => {
                        if (result?.getText()) {
                            handleDetected(result.getText());
                        }
                    }
                );
                if (cancelled) {
                    controls.stop();
                    return;
                }
                zxingControlsRef.current = controls;
                setIsCameraReady(true);
            } catch {
                setCameraError('当前浏览器不支持扫码识别');
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, []);

    useEffect(() => {
        return;
    }, [scanState, cameraError]);

    return (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col animate-fade-in">
            {/* Camera Header */}
            <div
                className="absolute top-0 left-0 right-0 z-[130] bg-black/85 pointer-events-auto"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                <div className="h-16 flex items-center justify-center relative">
                    <button
                        type="button"
                        aria-label="返回"
                        onClick={handleClose}
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white pointer-events-auto"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-white font-bold text-base tracking-wide">扫码核销</div>
                </div>
            </div>

            {/* Viewfinder Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center pointer-events-none">
                
                {/* Simulated Camera Feed (Static + Noise) */}
                <div className="absolute inset-0 bg-gray-900">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        autoPlay
                        muted
                    />
                    <div className="absolute inset-0 bg-black/30"></div>
                </div>

                {/* Dark Overlay around the box */}
                <div className="absolute inset-0 border-[60px] border-black/50 box-border pointer-events-none z-10"></div>

                {/* Scan Box */}
                <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl z-20 flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-island-primary rounded-tl-xl -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-island-primary rounded-tr-xl -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-island-primary rounded-bl-xl -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-island-primary rounded-br-xl -mb-1 -mr-1"></div>

                    {/* Scanning Line Animation */}
                    {scanState === 'scanning' && (
                        <div className="absolute top-0 w-full h-full overflow-hidden rounded-3xl opacity-50">
                             <div className="w-full h-1 bg-gradient-to-r from-transparent via-island-primary to-transparent shadow-[0_0_15px_rgba(78,205,196,0.8)] animate-scan-line"></div>
                        </div>
                    )}

                    {/* Success State */}
                    {scanState === 'success' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-island-primary/20 backdrop-blur-sm animate-scale-up">
                            <div className="w-16 h-16 bg-island-primary rounded-full flex items-center justify-center shadow-lg mb-2">
                                <Check size={32} className="text-white stroke-[4]" />
                            </div>
                            <span className="text-white font-bold text-lg drop-shadow-md">识别成功</span>
                        </div>
                    )}
                </div>

                {cameraError && (
                    <div className="absolute bottom-40 left-4 right-4 z-20">
                        <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/40 text-center">
                            <div className="text-sm font-bold text-red-500">{cameraError}</div>
                            <div className="mt-2 text-xs text-gray-500">请使用手机浏览器并允许摄像头权限</div>
                        </div>
                    </div>
                )}
                {!cameraError && !isCameraReady && (
                    <div className="absolute bottom-40 left-4 right-4 z-20">
                        <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/40 text-center text-sm font-bold text-island-dark">
                            正在打开摄像头...
                        </div>
                    </div>
                )}
                {error && !cameraError && (
                    <div className="absolute bottom-28 left-4 right-4 z-20">
                        <div className="bg-white/95 backdrop-blur rounded-2xl p-3 shadow-xl border border-white/40 text-center text-xs font-bold text-red-500">
                            {error}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls removed per new design */}

            <style>{`
                @keyframes scan-line {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(256px); opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

interface Props {
    orders: Order[];
    onUpdateOrder: (order: Order) => void;
    onScannerOpenChange?: (open: boolean) => void;
}

export const OrderManager: React.FC<Props> = ({ orders, onUpdateOrder, onScannerOpenChange }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [nowMs, setNowMs] = useState(() => Date.now());
    const autoCancelingRef = useRef<Set<string>>(new Set());
  
  // Scanner & Verification State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
    const statusLabels: Record<Order['status'], string> = {
        'pending-payment': '待支付',
        'pending-confirmation': '待确认',
        preparing: '制作中',
        ready: '待取餐',
        delivering: '配送中',
        completed: '已完成',
        cancelled: '已取消',
    };

  const handleStatusChange = (orderId: string, newStatus: Order['status'], cancelReason?: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        onUpdateOrder({
            ...order,
            status: newStatus,
            cancelReason: newStatus === 'cancelled' ? cancelReason : undefined,
        });
    }
  };

    const handleOpenScanner = () => {
        setIsScannerOpen(true);
        onScannerOpenChange?.(true);
    };

    const handleCloseScanner = () => {
        setIsScannerOpen(false);
        onScannerOpenChange?.(false);
    };

    useEffect(() => {
        if (!orders.some((order) => order.status === 'pending-payment')) return;
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [orders]);

    useEffect(() => {
        const expiredOrders = orders.filter((order) => {
            if (order.status !== 'pending-payment') return false;
            const createdAtMs = (() => {
                const dateValue = order.createdAt || order.date;
                const parsed = Date.parse(dateValue);
                if (!Number.isNaN(parsed)) return parsed;
                const idParts = order.id.split('_');
                if (idParts.length >= 3) {
                    const ts = Number(idParts[1]);
                    if (!Number.isNaN(ts)) return ts;
                }
                return 0;
            })();
            if (!createdAtMs) return false;
            return nowMs - createdAtMs >= 10 * 60 * 1000;
        });

        if (expiredOrders.length === 0) return;

        expiredOrders.forEach((order) => {
            if (autoCancelingRef.current.has(order.id)) return;
            autoCancelingRef.current.add(order.id);
            handleStatusChange(order.id, 'cancelled', '超时未支付');
        });
    }, [orders, nowMs]);

  const parseScanPayload = (rawValue: string) => {
      const trimmed = rawValue.trim();
      if (!trimmed) return { pickupCode: '' };
      const parts = trimmed.split('|');
      if (parts.length >= 2 && parts[0].toUpperCase() === 'TTN') {
          if (parts.length >= 4) {
              return { vendorId: parts[1], orderId: parts[2], pickupCode: parts[3] };
          }
          return { orderId: parts[1], pickupCode: parts[2] };
      }
      return { pickupCode: trimmed };
  };

  const handleScanSuccess = (rawValue: string) => {
      const payload = parseScanPayload(rawValue);
      const normalizedPickup = (payload.pickupCode || '').trim().toUpperCase();
      let order = payload.orderId ? orders.find(o => o.id === payload.orderId) : undefined;
      if (!order && normalizedPickup) {
          order = orders.find(o => (o.pickupCode || '').toUpperCase() === normalizedPickup);
      }

      if (!order) {
          return { ok: false, message: '未找到该取餐码的订单' };
      }
      if (payload.vendorId && order.vendorId !== payload.vendorId) {
          return { ok: false, message: '该二维码不属于当前摊位' };
      }

      if (order.orderType === 'delivery') {
          return { ok: false, message: '该订单为外卖配送，无需扫码核销' };
      }

      if (order.status !== 'ready') {
          return { ok: false, message: `当前状态为${statusLabels[order.status] || '不可核销'}` };
      }

      setVerifyingOrder(order);
      return { ok: true };
  };

  const handleVerificationConfirm = () => {
      if (!verifyingOrder) return;
      playSound('success');
      handleStatusChange(verifyingOrder.id, 'completed');
      setVerifyingOrder(null);
  };

  const handleVerificationCancel = () => {
      setVerifyingOrder(null);
  };

    const isProofPendingReview = (order: Order) =>
      order.status === 'cancelled' &&
      order.cancelReason === 'payment-not-received' &&
      Array.isArray(order.paymentProofs) &&
      order.paymentProofs.length > 0;

    const isPendingTabOrder = (order: Order) =>
      order.status === 'pending-payment' ||
      order.status === 'pending-confirmation' ||
      isProofPendingReview(order);

    const isHistoryTabOrder = (order: Order) =>
      ['completed', 'cancelled'].includes(order.status) && !isProofPendingReview(order);

    const filteredOrders = orders.filter(order => {
      // 1. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesPickup = order.pickupCode?.toLowerCase().includes(query);
        const matchesItems = order.items.some(i => i.name.toLowerCase().includes(query));
        const matchesPhone = order.address?.contactPhone.includes(query);
        const matchesBuyerPhone = order.buyerPhone?.includes(query);
        
        if (!matchesId && !matchesPickup && !matchesItems && !matchesPhone && !matchesBuyerPhone) {
            return false;
        }
    }

    // 2. Tab Filter
      if (activeTab === 'pending') return isPendingTabOrder(order);
      if (activeTab === 'processing') return ['preparing', 'ready', 'delivering'].includes(order.status);
      if (activeTab === 'history') return isHistoryTabOrder(order);
      return false;
    });
    const getOrderCreatedAtMs = (order: Order) => {
        const dateValue = order.createdAt || order.date;
        const parsed = Date.parse(dateValue);
        if (!Number.isNaN(parsed)) return parsed;
        const idParts = order.id.split('_');
        if (idParts.length >= 3) {
            const ts = Number(idParts[1]);
            if (!Number.isNaN(ts)) return ts;
        }
        return 0;
    };
    const parseDateToMs = (value?: string) => {
        if (!value) return null;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    };
    const getOrderSortTimestamp = (order: Order) => {
        const candidates =
            activeTab === 'history'
                ? [order.completedAt, order.statusUpdatedAt, order.paidAt, order.createdAt, order.date]
                : activeTab === 'processing'
                  ? [order.statusUpdatedAt, order.paidAt, order.createdAt, order.date]
                  : [order.createdAt, order.date];
        for (const candidate of candidates) {
            const parsed = parseDateToMs(candidate);
            if (parsed !== null) return parsed;
        }
        return getOrderCreatedAtMs(order);
    };
    const formatDateTime = (value?: string) => {
        if (!value) return '--';
        const trimmed = value.trim();
        if (!trimmed || trimmed === '--') return '--';
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) {
            const date = new Date(parsed);
            return date
                .toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                .replace(/\//g, '-');
        }
        return trimmed.replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z?$/, '');
    };
    const formatCountdown = (valueMs: number) => {
        const totalSeconds = Math.max(0, Math.ceil(valueMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (activeTab === 'pending') {
            const priority = (status: Order['status']) =>
                status === 'pending-confirmation' ? 0 : status === 'pending-payment' ? 1 : 2;
            const diff = priority(a.status) - priority(b.status);
            if (diff !== 0) return diff;
            return getOrderCreatedAtMs(b) - getOrderCreatedAtMs(a);
        }
        return getOrderSortTimestamp(b) - getOrderSortTimestamp(a);
    });

  return (
    <div className="h-full flex flex-col">
      
      {/* Search Bar */}
      <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索订单号 / 取餐码 / 餐品 / 手机号"
                className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-primary/20 transition-all border border-gray-100 shadow-sm"
              />
              <Search size={16} className="absolute left-3.5 top-2.5 text-gray-400" />
              {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-island-dark"
                  >
                      <X size={16} />
                  </button>
              )}
          </div>
          <button
            onClick={handleOpenScanner}
            className="h-11 px-4 rounded-xl bg-island-dark text-white font-bold text-sm shadow-lg shadow-island-dark/20 flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all"
          >
            <ScanLine size={16} />
            扫码核销
          </button>
      </div>

      {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'pending', label: '待处理', count: orders.filter(isPendingTabOrder).length },
            { id: 'processing', label: '进行中', count: orders.filter(o => ['preparing', 'ready', 'delivering'].includes(o.status)).length },
            { id: 'history', label: '历史订单', count: orders.filter(isHistoryTabOrder).length }
          ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-bold transition-all border ${
              activeTab === tab.id
                ? 'bg-island-dark text-white border-island-dark shadow-md shadow-island-dark/10'
                : 'bg-white text-text-secondary border-transparent hover:bg-white/80'
            }`}
          >
            {tab.label}
            {tab.count > 0 && tab.id !== 'history' && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-white text-island-dark' : 'bg-island-primary/20 text-island-dark'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
               <Clock size={32} className="text-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-400">暂无相关订单</p>
            {searchQuery && <p className="text-xs text-gray-300 mt-2">换个关键词试试？</p>}
          </div>
        ) : (
          sortedOrders.map(order => {
            const displayOrderNo = (order.orderNo || order.id).toUpperCase();
            const displayOrderNoShort = displayOrderNo.length > 14 ? displayOrderNo.slice(-12) : displayOrderNo;
            const paymentLabel = order.paymentMethod || '\u5fae\u4fe1\u652f\u4ed8';
            const isAlipay = paymentLabel.includes('\u652f\u4ed8\u5b9d');
            const orderStatus = order.status;
            const needsProofReview = isProofPendingReview(order);
              const paymentStatusLabel = order.paymentStatus === 'paid'
                ? '已支付'
                : order.paymentStatus === 'refunded'
                  ? '已退款'
                  : order.paymentStatus === 'partially_refunded'
                    ? '部分退款'
                    : ['completed', 'preparing', 'ready', 'delivering', 'pending-confirmation'].includes(order.status)
                      ? '已支付'
                      : '未支付';
              const subtotal = typeof order.subtotal === 'number' ? order.subtotal : order.totalPrice;
              const packagingFee = typeof order.packagingFee === 'number' ? order.packagingFee : 0;
              const serviceFee = typeof order.serviceFee === 'number' ? order.serviceFee : 0;
              const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
              const discountRaw = typeof order.discount === 'number' ? order.discount : 0;
              const discount = discountRaw === 0 ? 0 : -Math.abs(discountRaw);
              const finalTotal = typeof order.finalTotal === 'number' ? order.finalTotal : order.totalPrice;
            const formatMoney = (value: number) => {
              const rounded = Math.round(value * 100) / 100;
              return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
            };
              const createdAt = order.createdAt || order.date || '--';
              const createdAtMs = getOrderCreatedAtMs(order);
              const pendingRemainingMs =
                orderStatus === 'pending-payment' && createdAtMs
                  ? Math.max(0, createdAtMs + 10 * 60 * 1000 - nowMs)
                  : null;
              const isPendingExpired =
                orderStatus === 'pending-payment' && pendingRemainingMs !== null && pendingRemainingMs <= 0;
              const pendingCountdown =
                pendingRemainingMs !== null && pendingRemainingMs > 0 ? formatCountdown(pendingRemainingMs) : null;
              const paidAt = formatDateTime(order.paidAt);
              const completedAt = formatDateTime(order.completedAt);
              const createdAtDisplay = formatDateTime(createdAt);
              const showTimeline = activeTab === 'history';
              const contactPhone = order.address?.contactPhone || '';

            return (
            <div key={order.id} className="bg-white rounded-[24px] p-5 shadow-card border border-white relative overflow-hidden group hover:border-island-primary/20 transition-all">
              {/* Header */}
              <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        order.orderType === 'delivery' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                      }`}
                    >
                      {order.orderType === 'delivery' ? '外卖配送' : '堂食/自提'}
                    </span>
                    <span className="text-xs font-bold text-island-dark bg-island-bg px-2 py-1 rounded-full">
                      #{displayOrderNoShort}
                    </span>
                  </div>
                    <div className="text-xs text-gray-400 font-medium">{createdAtDisplay} 下单</div>
                    {orderStatus === 'pending-payment' && pendingCountdown && (
                      <div className="mt-1 text-[11px] font-bold text-[#b45309]">
                        待支付倒计时 {pendingCountdown}
                      </div>
                    )}
                    {orderStatus === 'pending-payment' && !pendingCountdown && isPendingExpired && (
                      <div className="mt-1 text-[11px] font-bold text-[#b42318]">
                        超时未支付，自动取消中
                      </div>
                    )}
                  </div>
                
                <div className="text-right">
                  <div className="font-english font-black text-2xl text-island-dark">{'\u00a5'}{formatMoney(finalTotal)}</div>
                  <div
                    className={`mt-2 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                      isAlipay ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {paymentLabel}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4 mb-5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex gap-3">
                       {/* Image with Badge */}
                       <div className="relative w-11 h-11 shrink-0">
                          <img 
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'} 
                            alt={item.name}
                            className="w-full h-full rounded-[10px] object-cover bg-gray-50 border border-black/5" 
                          />
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-island-primary text-white text-[9px] font-black flex items-center justify-center border border-white shadow-sm ring-1 ring-white">
                             {idx + 1}
                          </div>
                       </div>
                       
                       <div className="flex flex-col py-0.5">
                           <span className="font-bold text-sm text-island-dark leading-tight">{item.name}</span>
                           {item.specs && item.specs.length > 0 && (
                             <span className="text-[12px] text-island-dark mt-1 bg-[#eef7f4] px-2 py-1 rounded-lg self-start border border-[#cce8e4] font-bold">
                               {item.specs.join(' / ')}
                             </span>
                           )}
                       </div>
                    </div>
                    <span className="font-english font-bold text-sm text-island-dark mt-1">x{item.count}</span>
                  </div>
                ))}
              </div>

              {/* Pricing & Timeline */}
              <div className="bg-[#f8fbfa] rounded-[18px] p-3 mb-5 border border-[#193b35]/10">
                {showTimeline && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">订单号</div>
                      <div className="text-[#193b35] font-bold break-all">{displayOrderNo}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">支付状态</div>
                      <div className="text-[#193b35] font-bold">{paymentStatusLabel}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">下单时间</div>
                      <div className="text-[#193b35] font-bold">{createdAtDisplay}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">付款时间</div>
                      <div className="text-[#193b35] font-bold">{paidAt}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">完成时间</div>
                      <div className="text-[#193b35] font-bold">{completedAt}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#193b35]/50 font-bold">支付方式</div>
                      <div className="text-[#193b35] font-bold">{paymentLabel}</div>
                    </div>
                  </div>
                )}
                <div className={`${showTimeline ? 'mt-3 pt-3 border-t border-[#193b35]/10' : ''} text-xs space-y-1`}>
                  <div className="flex justify-between text-[#193b35]/70">
                    <span>商品小计</span>
                    <span className="font-bold">¥{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#193b35]/70">
                    <span>打包费</span>
                    <span className="font-bold">¥{formatMoney(packagingFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#193b35]/70">
                    <span>服务费</span>
                    <span className="font-bold">¥{formatMoney(serviceFee)}</span>
                  </div>
                  {order.orderType === 'delivery' && (
                    <div className="flex justify-between text-[#193b35]/70">
                      <span>配送费</span>
                      <span className="font-bold">¥{formatMoney(deliveryFee)}</span>
                    </div>
                  )}
                  {discount !== 0 && (
                    <div className="flex justify-between text-[#b42318]">
                      <span>优惠</span>
                      <span className="font-bold">-¥{formatMoney(Math.abs(discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#193b35] text-sm font-black pt-1">
                    <span>实付金额</span>
                    <span>¥{formatMoney(finalTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {order.remarks && (
                <div className="bg-amber-50/80 border border-amber-100 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-800 mb-5 flex items-start gap-2.5">
                   <MessageSquareText size={14} className="shrink-0 mt-0.5 text-amber-600/70" /> 
                   <span className="leading-relaxed opacity-90">{order.remarks}</span>
                </div>
              )}

              {activeTab !== 'history' && order.paymentProofs && order.paymentProofs.length > 0 && (
                <div className="bg-[#f8fbfa] border border-[#193b35]/10 px-3 py-3 rounded-xl mb-5">
                  <div className="text-xs font-bold text-[#193b35] mb-2">支付凭证</div>
                  <div className="grid grid-cols-3 gap-2">
                    {order.paymentProofs.map((proof, index) => (
                      <div key={`${proof.url}-${index}`} className="rounded-lg border border-[#193b35]/10 overflow-hidden bg-white">
                        <img src={proof.url} alt="支付凭证" className="w-full h-20 object-cover" loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info (Delivery) or Pickup Code (Dine-in) */}
              <div className="bg-island-bg rounded-[18px] p-3 mb-5 border border-island-sidebar">
                {order.orderType === 'delivery' && order.address ? (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-white border border-white shadow-sm flex items-center justify-center shrink-0 text-island-dark">
                      <User size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-island-dark flex items-center">
                          {order.address.contactName}
                          {contactPhone && (
                            <span className="text-text-secondary font-english font-black ml-2 text-xs">
                              {order.address.contactPhone}
                            </span>
                          )}
                        </div>
                      <div className="text-xs text-text-secondary mt-0.5 flex items-start gap-1 leading-normal">
                        <MapPin size={10} className="mt-0.5 shrink-0" /> 
                        <span className="break-words">{order.address.location} {order.address.detail}</span>
                      </div>
                        {order.buyerPhone && order.buyerPhone !== order.address.contactPhone && (
                          <div className="text-[11px] text-text-secondary mt-1 font-medium">
                            联系电话：
                            <span className="font-black text-island-dark ml-1">{order.buyerPhone}</span>
                          </div>
                        )}
                    </div>
                    <a href={`tel:${order.address.contactPhone}`} className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-island-dark hover:bg-island-primary hover:text-white transition-colors shadow-sm">
                      <Phone size={15} />
                    </a>
                  </div>
                ) : (
                  <div className="px-2 py-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-text-secondary">取餐号码</span>
                      <span className="text-3xl font-english font-black text-island-dark tracking-widest">{order.pickupCode}</span>
                    </div>
                    {order.buyerPhone && (
                      <div className="mt-2 text-xs text-text-secondary font-medium">
                        联系电话：
                        <span className="font-black text-island-dark ml-1">{order.buyerPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {needsProofReview && (
                  <>
                    <button
                      onClick={() => handleStatusChange(order.id, 'cancelled', '未收到付款')}
                      className="flex-1 py-3 rounded-[16px] border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 text-sm active:scale-95 transition-all"
                    >
                      仍未收到
                    </button>
                    <button
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="flex-[2] py-3 rounded-[16px] bg-island-dark text-white font-bold shadow-lg shadow-island-dark/20 text-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      确认收款
                    </button>
                  </>
                )}
                {orderStatus === 'pending-payment' && isPendingExpired && (
                  <div className="w-full text-center py-2 text-xs font-bold text-[#b42318] bg-red-50 rounded-xl">
                    超时未支付，订单自动取消
                  </div>
                )}
                {orderStatus === 'pending-payment' && !isPendingExpired && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(order.id, 'cancelled', 'payment-not-received')}
                      className="flex-1 py-3 rounded-[16px] border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 text-sm active:scale-95 transition-all"
                    >
                      未收到
                    </button>
                    <button 
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="flex-[2] py-3 rounded-[16px] bg-island-dark text-white font-bold shadow-lg shadow-island-dark/20 text-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      确认收款
                    </button>
                  </>
                )}

                {orderStatus === 'pending-confirmation' && (
                  <>
                    <button 
                      onClick={() => handleStatusChange(order.id, 'cancelled', 'payment-not-received')}
                      className="flex-1 py-3 rounded-[16px] border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 text-sm active:scale-95 transition-all"
                    >
                      未收到
                    </button>
                    <button 
                      onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="flex-[2] py-3 rounded-[16px] bg-island-dark text-white font-bold shadow-lg shadow-island-dark/20 text-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      确认收款
                    </button>
                  </>
                )}
                
                {orderStatus === 'preparing' && (
                  <button 
                    onClick={() => handleStatusChange(order.id, 'ready')}
                    className="w-full py-3 rounded-[16px] bg-island-primary text-white font-bold shadow-lg shadow-island-primary/20 text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
                  >
                    <CheckCircle size={18} />
                    {order.orderType === 'delivery' ? '制作完成，呼叫骑手' : '制作完成，通知取餐'}
                  </button>
                )}

                {orderStatus === 'ready' && (
                  <div className="w-full flex gap-3">
                     {order.orderType === 'delivery' ? (
                       <div className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 rounded-[16px] font-bold text-sm border border-blue-100">
                          <Bike size={16} /> 骑手赶往中
                       </div>
                     ) : (
                       <button
                        onClick={() => setVerifyingOrder(order)}
                        className="flex-1 py-3 rounded-[16px] bg-island-dark text-white font-bold shadow-lg shadow-island-dark/20 text-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                       >
                          <CheckCircle size={18} />
                          核销订单
                       </button>
                     )}

                     {order.orderType === 'delivery' && (
                        <button 
                            onClick={() => handleStatusChange(order.id, 'completed')}
                            className="flex-1 py-3 rounded-[16px] bg-green-500 text-white font-bold shadow-lg shadow-green-500/20 text-sm hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            完成订单
                        </button>
                     )}
                  </div>
                )}
                
                {!needsProofReview && (orderStatus === 'completed' || orderStatus === 'cancelled') && (
                  <div className="w-full text-center py-2 text-xs font-bold text-text-secondary bg-gray-50 rounded-xl">
                    {orderStatus === 'completed' ? '订单已完成' : '订单已取消'}
                  </div>
                )}
              </div>

            </div>
          );
        })
        )}
      </div>

      {/* Scanner Modal */}
      {isScannerOpen && (
          <ScannerModal onClose={handleCloseScanner} onScanSuccess={handleScanSuccess} />
      )}

      {/* Verification Modal */}
      {verifyingOrder && (
          <VerificationModal
            order={verifyingOrder}
            onConfirm={handleVerificationConfirm}
            onCancel={handleVerificationCancel}
          />
      )}
    </div>
  );
};
