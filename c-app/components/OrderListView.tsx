import React, { useMemo, useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Order } from '../types';
import { ChevronRight, Ticket, ShellIcon, PalmLeafIcon, Star, Edit3 } from './Icons';
import { StatePanel } from './StatePanel';
import { PullToRefresh } from './PullToRefresh';
import { fetchOrdersByPhone } from '../services/api';

const SHOW_PHONE_SEARCH = false;
const SHOW_REVIEW_ACTION = false;

const getStatusConfig = (status: Order['status']) => {
  switch (status) {
    case 'preparing':
      return {
        label: '制作中',
        color: 'text-orange-600',
        bg: 'bg-orange-100',
      };
    case 'pending-payment':
      return {
        label: '待支付',
        color: 'text-[#b45309]',
        bg: 'bg-[#fff7ed]',
      };
    case 'pending-confirmation':
      return {
        label: '待确认',
        color: 'text-[#2d4f48]',
        bg: 'bg-[#e0f2f1]',
      };
    case 'ready':
      return {
        label: '待取餐',
        color: 'text-[#193b35]',
        bg: 'bg-[#e2f3a6]',
      };
    case 'delivering':
      return {
        label: '配送中',
        color: 'text-orange-600',
        bg: 'bg-orange-100',
      };
    case 'completed':
      return { label: '已完成', color: 'text-gray-500', bg: 'bg-gray-100' };
    case 'cancelled':
      return { label: '已取消', color: 'text-red-500', bg: 'bg-red-50' };
    default:
      return { label: '订单状态', color: 'text-gray-500', bg: 'bg-gray-100' };
  }
};

const formatCancelReason = (reason?: string) => {
  if (!reason) return '';
  if (reason === 'payment-not-received') return '未收到付款';
  return reason;
};

interface OrderListViewProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  onReorder: (vendorId: string) => void;
  onBrowse: () => void;
  onReview?: (order: Order) => void;
  initialScrollTop?: number;
  onScrollTopChange?: (value: number) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
}

export const OrderListView: React.FC<OrderListViewProps> = ({
  orders,
  onOrderClick,
  onReorder,
  onBrowse,
  onReview,
  initialScrollTop = 0,
  onScrollTopChange,
  isLoading = false,
  loadError = null,
  onRetry,
  onRefresh,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didRestoreRef = useRef(false);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [remoteOrders, setRemoteOrders] = useState<Order[] | null>(null);
  const normalizedQuery = SHOW_PHONE_SEARCH ? phoneQuery.replace(/\D/g, '').trim() : '';
  const searchSource = remoteOrders ?? orders;
  const visibleOrders = useMemo(() => {
    if (!normalizedQuery) return searchSource;
    return searchSource.filter((order) => {
      const phone = order.buyerPhone || order.address?.contactPhone || '';
      return phone.replace(/\D/g, '').includes(normalizedQuery);
    });
  }, [searchSource, normalizedQuery]);

  useEffect(() => {
    if (!SHOW_PHONE_SEARCH) {
      setRemoteOrders(null);
      return;
    }
    if (typeof window === 'undefined') return;
    if (!normalizedQuery) {
      setRemoteOrders(null);
      return;
    }
    if (normalizedQuery.length < 4) {
      setRemoteOrders(null);
      return;
    }
    let cancelled = false;
    setRemoteOrders(null);
    const timer = window.setTimeout(async () => {
      try {
        const data = await fetchOrdersByPhone(normalizedQuery);
        if (!cancelled) {
          setRemoteOrders(data);
        }
      } catch {
        if (!cancelled) {
          setRemoteOrders([]);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedQuery]);

  useLayoutEffect(() => {
    if (didRestoreRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    if (initialScrollTop > 0) {
      container.scrollTop = initialScrollTop;
    }
    didRestoreRef.current = true;
  }, [initialScrollTop]);

  return (
    <div className="flex-1 overflow-hidden relative bg-[#f4f9f8]">
      {/* Background Decor - Subtle & Clean */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(#193b35 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        ></div>
        <div className="absolute top-24 -right-4 text-[#193b35] opacity-[0.04] transform rotate-12">
          <Ticket className="w-24 h-24" />
        </div>
        <div className="absolute bottom-20 -left-6 text-[#193b35] opacity-[0.04] transform -rotate-12">
          <PalmLeafIcon className="w-32 h-32" />
        </div>
        <div className="absolute top-1/2 right-4 text-[#193b35] opacity-[0.06] transform rotate-45">
          <ShellIcon className="w-6 h-6" />
        </div>
        <div className="absolute top-32 left-6 text-[#193b35] opacity-[0.06]">
          <Star className="w-4 h-4" />
        </div>
      </div>

      <PullToRefresh
        containerRef={scrollRef}
        onRefresh={onRefresh ?? onRetry}
        className="absolute inset-0 z-10 overflow-y-auto no-scrollbar pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+140px)] px-5"
        onScroll={(event) => onScrollTopChange?.(event.currentTarget.scrollTop)}
      >
        <div className="mb-6 animate-[fadeIn_0.5s_ease-out]">
          <h1 className="text-[28px] font-display font-heavy text-[#193b35]">我的订单</h1>
          <p className="text-[#2d4f48] text-sm opacity-60 font-medium">美味正在制作</p>
          {SHOW_PHONE_SEARCH && (
            <div className="mt-4">
              <div className="bg-white/90 border border-[#193b35]/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phoneQuery}
                  onChange={(event) => setPhoneQuery(event.target.value)}
                  placeholder="输入手机号查询订单"
                  className="flex-1 bg-transparent text-sm text-[#193b35] placeholder:text-[#193b35]/40 focus:outline-none"
                  aria-label="输入手机号查询订单"
                />
                {normalizedQuery && (
                  <button
                    type="button"
                    onClick={() => setPhoneQuery('')}
                    className="text-[11px] font-heavy text-[#193b35]/60 hover:text-[#193b35] transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[#193b35]/40 font-medium">
                支持输入完整手机号或后四位快速查询
              </p>
            </div>
          )}
        </div>

        {loadError ? (
          <StatePanel
            variant="error"
            description={loadError}
            actionLabel="重试"
            onAction={onRetry}
          />
        ) : isLoading ? (
          <StatePanel variant="loading" />
        ) : visibleOrders.length === 0 ? (
          <StatePanel
            variant="empty"
            title={normalizedQuery ? '未找到订单' : '暂无订单'}
            description={
              normalizedQuery
                ? '请确认手机号是否正确'
                : '海风正暖，先去摊位上看看'
            }
            actionLabel={normalizedQuery ? '清空搜索' : '去逛逛'}
            onAction={normalizedQuery ? () => setPhoneQuery('') : onBrowse}
          />
        ) : (
          <div className="space-y-4">
            {[...visibleOrders].reverse().map((order) => {
              const status = getStatusConfig(order.status);
              const isCompleted = order.status === 'completed' || order.status === 'cancelled';
              const isReady = order.status === 'ready';

              return (
                <div
                  key={order.id}
                  onClick={() => onOrderClick(order)}
                  aria-label={`查看${order.vendorName}订单`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOrderClick(order);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cv-auto bg-white/80 backdrop-blur-sm rounded-[20px] p-4 shadow-sm border border-white flex flex-col gap-3 active:scale-[0.98] transition-all duration-200 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.vendorImage}
                        alt={order.vendorName}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100"
                        loading="lazy"
                        decoding="async"
                      />
                      <div>
                        <h3 className="font-black text-[#193b35] text-sm flex items-center gap-1">
                          {order.vendorName}
                          <ChevronRight size={14} className="opacity-50" />
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 font-bold">{order.date}</span>
                          {order.orderType === 'dine-in' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#f0f7f5] text-[#193b35] font-heavy">
                              堂食
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-heavy ${status.bg} ${status.color}`}>
                      {status.label}
                    </div>
                  </div>

                  <div className="pl-[52px]">
                    <div className="text-xs text-[#2d4f48] mb-2 line-clamp-1 opacity-80 font-bold">
                      {order.itemsSummary}
                    </div>

                    {order.remarks && (
                      <div className="flex items-start gap-1.5 mb-2 bg-[#f4f9f8] p-1.5 rounded-lg border border-[#193b35]/5 w-fit max-w-full">
                        <Edit3 size={10} className="text-[#193b35]/40 mt-0.5 shrink-0" />
                        <span className="text-[10px] text-[#193b35]/60 font-heavy line-clamp-1 break-all">
                          备注: {order.remarks}
                        </span>
                      </div>
                    )}
                    {order.status === 'cancelled' && order.cancelReason && (
                      <div className="mb-2 text-[10px] text-red-400 font-bold">
                        取消原因: {formatCancelReason(order.cancelReason)}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400 font-bold">共{order.count}件商品</span>
                      <div className="text-sm font-heavy text-[#193b35]">
                        <span className="text-xs">￥</span>
                        {order.totalPrice}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-gray-50/50">
                    {SHOW_REVIEW_ACTION && order.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReview?.(order);
                        }}
                        className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-[#193b35] font-heavy hover:bg-gray-50 active:bg-gray-100 bg-white"
                      >
                        去评价
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(order.vendorId);
                        }}
                        className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-[#193b35] font-heavy hover:bg-gray-50 active:bg-gray-100 bg-white"
                      >
                        再来一单
                      </button>
                    )}

                    {order.status === 'delivering' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOrderClick(order);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#193b35] text-[#e2f3a6] text-xs font-heavy hover:opacity-90 active:scale-95 transition-transform"
                      >
                        查看详情
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOrderClick(order);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#e2f3a6] text-[#193b35] text-xs font-heavy hover:bg-[#dcedc8] active:scale-95 transition-all"
                      >
                        出示取餐码
                      </button>
                    )}

                    {order.orderType === 'dine-in' && order.status === 'preparing' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOrderClick(order);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#f1f7f5] text-[#193b35]/60 text-xs font-heavy cursor-default"
                      >
                        制作中
                      </button>
                    )}

                    {!isCompleted &&
                      !isReady &&
                      order.status !== 'delivering' &&
                      !(order.orderType === 'dine-in' && order.status === 'preparing') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOrderClick(order);
                          }}
                          className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-[#193b35] font-heavy hover:bg-gray-50 bg-white"
                        >
                          查看详情
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};

