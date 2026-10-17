﻿﻿import React, { useMemo } from 'react';
import { CartState, MenuItem, Vendor, SpecSelection } from '../types';
import { calculateItemPrice } from '../utils/pricing';
import { specLabels } from '../utils/specs';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { StatePanel } from './StatePanel';

interface CartDrawerProps {
  cart: CartState;
  vendors: Vendor[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCart: (product: MenuItem, delta: number, specs?: SpecSelection[]) => void;
  onCheckout: () => void;
  onEnterVendor: (vendor: Vendor) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cart,
  vendors,
  isOpen,
  onClose,
  onUpdateCart,
  onCheckout,
  onEnterVendor,
}) => {
  
  // Group cart items by Vendor
  const groupedItems = useMemo(() => {
    const groups: { vendor: Vendor; items: { product: MenuItem; count: number; specs: SpecSelection[] }[] }[] = [];
    
    Object.values(cart).forEach((cartItem) => {
      if (cartItem.count <= 0) return;
      const { product, count, specs } = cartItem;
      const vendor = vendors.find((item) => item.id === product.vendorId);
      if (!vendor) return;

      let group = groups.find(g => g.vendor.id === vendor.id);
      if (!group) {
        group = { vendor, items: [] };
        groups.push(group);
      }
      group.items.push({ product, count, specs });
    });

    return groups;
  }, [cart, vendors]);

  // Use calculateItemPrice for correct total
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (calculateItemPrice(item.product, item.specs) * item.count), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={onClose}></div>
      
      {/* Drawer Content */}
      <div className="relative z-10 bg-[#fdfcf8] w-full rounded-t-[32px] max-h-[85%] flex flex-col shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        
        {/* Header */}
        <div className="p-6 pb-2 shrink-0 flex items-center justify-between border-b border-gray-100/50">
          <div>
            <h2 className="text-2xl font-heavy text-[#193b35] flex items-center gap-2">
               <ShoppingBag className="fill-[#193b35]" size={24} />
               沙滩野餐篮
            </h2>
            <p className="text-xs font-bold text-[#193b35]/60 mt-1">跨摊位打包·到店自取</p>
          </div>
          <button onClick={onClose} aria-label="关闭" className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#193b35]">
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {groupedItems.length === 0 ? (
             <StatePanel
               variant="empty"
               title="篮子空空"
               description="快去装满美味的海岛小吃吧~"
               actionLabel="去逛逛"
               onAction={onClose}
             />
           ) : (
             groupedItems.map((group) => (
               <div key={group.vendor.id} className="bg-white border-2 border-[#193b35] rounded-[24px] p-4 shadow-[4px_4px_0px_#193b35]">
                  {/* Vendor Header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-dashed border-[#193b35]/20">
                     <img src={group.vendor.imageUrl} alt={group.vendor.name} className="w-6 h-6 rounded-full object-cover border border-[#193b35]" loading="lazy" decoding="async" />
                     <span className="font-black text-[#193b35] text-sm">{group.vendor.name}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-4">
                     {group.items.map(({ product, count, specs }, idx) => {
                       // Calculate single item price with specs
                       const singleItemPrice = calculateItemPrice(product, specs);
                       return (
                         <div
                           key={idx}
                           className="flex justify-between items-center"
                           onClick={() => onEnterVendor(group.vendor)}
                           onKeyDown={(event) => {
                             if (event.key === 'Enter' || event.key === ' ') {
                               event.preventDefault();
                               onEnterVendor(group.vendor);
                             }
                           }}
                           role="button"
                           tabIndex={0}
                         >
                            <div className="flex gap-3 items-center overflow-hidden cursor-pointer">
                               <img src={product.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-gray-50 shrink-0" loading="lazy" decoding="async" alt={product.name} />
                               <div className="min-w-0">
                                  <h4 className="text-sm font-black text-[#193b35] truncate">{product.name}</h4>
                                  {specs.length > 0 && (
                                      <div className="text-[10px] text-gray-400 truncate font-medium">{specLabels(specs).join(', ')}</div>
                                  )}
                                  <div className="text-[#193b35] font-heavy text-sm">¥{singleItemPrice}</div>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-3 bg-[#f0f7f5] rounded-full px-2 py-1 h-8 border border-[#dcece9]">
                                <button
                                  type="button"
                                  aria-label="减少"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onUpdateCart(product, -1, specs);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-[#193b35] active:scale-90 transition-transform"
                                >
                                  <Minus size={14} strokeWidth={3}/>
                                </button>
                                <span className="text-sm font-black w-4 text-center">{count}</span>
                                <button
                                  type="button"
                                  aria-label="增加"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onUpdateCart(product, 1, specs);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-[#193b35] active:scale-90 transition-transform"
                                >
                                  <Plus size={14} strokeWidth={3}/>
                                </button>
                            </div>
                         </div>
                       );
                     })}
                  </div>
               </div>
             ))
           )}
           
           {/* Pickup Info */}
           {groupedItems.length > 0 && (
             <div className="flex items-center gap-3 bg-[#cce8e4]/50 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#193b35] flex items-center justify-center text-[#e2f3a6]">
                   <ShoppingBag size={16} />
                </div>
                <div className="flex-1">
                   <div className="text-xs font-black text-[#193b35]">打包取餐</div>
                   <div className="text-[10px] text-[#2d4f48]/70 font-bold">多摊位合单，取餐更方便</div>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        {groupedItems.length > 0 && (
          <div className="p-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] bg-white border-t border-gray-100 rounded-b-[32px]">
             <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500 font-bold">商品总计</span>
                <span className="text-2xl font-heavy text-[#193b35]">¥{totalPrice}</span>
             </div>
             <button 
                onClick={onCheckout}
                className="w-full h-14 bg-[#193b35] text-[#e2f3a6] rounded-2xl font-black text-lg shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all flex items-center justify-center gap-2"
             >
                <span>立即支付</span>
                <span className="font-heavy">¥{totalPrice}</span>
             </button>
          </div>
        )}
      </div>
    </div>
  );
};


