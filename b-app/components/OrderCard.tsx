import React from 'react';
import { Order } from '../types';
import { Utensils } from 'lucide-react';

interface Props {
  order: Order;
}

export const OrderCard: React.FC<Props> = ({ order }) => {
  const isReady = order.status === 'ready';
  const statusLabel = isReady
    ? '待取餐'
    : order.status === 'preparing'
      ? '制作中'
      : order.status === 'pending-confirmation'
        ? '待确认'
        : order.status === 'pending-payment'
          ? '待接单'
          : '已接单';

  return (
    <div className={`p-4 rounded-[20px] mb-4 relative overflow-hidden transition-all duration-300 ${
      isReady
        ? 'bg-white shadow-float border border-island-primary/20'
        : 'bg-white/60 border border-white shadow-sm'
    }`}>
      <div className="flex gap-3 relative z-10">
        {/* 图片 */}
        <div className="w-16 h-16 rounded-[14px] bg-gray-100 overflow-hidden shrink-0 shadow-inner">
          <img src={order.imageUrl || order.vendorImage} alt={order.vendorName} className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-[15px] text-island-dark leading-tight line-clamp-1">
              {order.vendorName}
            </h3>
            {/* 状态徽章 */}
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              isReady ? 'bg-island-accent text-white shadow-sm' : 'bg-island-dark/5 text-island-dark/50'
            }`}>
              {statusLabel}
            </div>
          </div>

          <div className="flex justify-between items-end mt-1">
            <div className="flex flex-col">
              {isReady ? (
                <div className="flex items-baseline gap-1 text-island-primary">
                  <span className="text-[10px] font-medium opacity-80">取餐码</span>
                  <span className="text-xl font-english font-bold tracking-tight">{order.pickupCode}</span>
                </div>
              ) : (
                <div className="text-xs text-island-dark/40 font-medium">
                  {order.statusMessage || '美味正在制作中..'}
                </div>
              )}
            </div>

            {/* 简略的物品列表 */}
            <div className="text-[10px] text-island-dark/40 font-medium bg-island-bg px-2 py-1 rounded-lg max-w-[100px] truncate">
              {order.items[0].name} {order.items.length > 1 && `+${order.items.length - 1}`}
            </div>
          </div>
        </div>
      </div>

      {/* 装饰背景圆环 */}
      {isReady && (
        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-island-primary/5 rounded-full z-0 pointer-events-none"></div>
      )}
    </div>
  );
};
