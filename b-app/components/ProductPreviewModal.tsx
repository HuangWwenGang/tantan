
import React, { useState } from 'react';
import { X, Plus, Heart } from 'lucide-react';
import { MenuItem } from '../types';

interface Props {
  product: MenuItem;
  onClose: () => void;
}

export const ProductPreviewModal: React.FC<Props> = ({ product, onClose }) => {
  // 模拟客户端的状态
  const [selections, setSelections] = useState<Record<string, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 初始化默认选项
  React.useEffect(() => {
    const initialSelections: Record<string, number[]> = {};
    product.options?.forEach(option => {
      if (option.required && option.choices.length > 0) {
        // 找到第一个未售罄的选项
        const firstAvailableIndex = option.choices.findIndex(c => !c.isSoldOut);
        if (firstAvailableIndex !== -1) {
            initialSelections[option.name] = [firstAvailableIndex];
        } else {
            initialSelections[option.name] = []; 
        }
      } else {
        initialSelections[option.name] = [];
      }
    });
    setSelections(initialSelections);
  }, [product]);

  const showTempError = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 2000);
  };

  // 处理规格选择
  const handleSelect = (optionName: string, choiceIndex: number, required: boolean, maxSelection?: number) => {
    setSelections(prev => {
      const current = prev[optionName] || [];
      
      if (required) {
        // 单选逻辑
        return { ...prev, [optionName]: [choiceIndex] };
      } else {
        // 多选逻辑
        if (current.includes(choiceIndex)) {
            // 取消选择
            return { ...prev, [optionName]: current.filter(i => i !== choiceIndex) };
        } else {
            // 新增选择
            // 检查数量上限
            if (maxSelection && maxSelection > 0 && current.length >= maxSelection) {
                showTempError(`最多只能选择 ${maxSelection} 项哦`);
                return prev;
            }
            return { ...prev, [optionName]: [...current, choiceIndex] };
        }
      }
    });
  };

  // 计算总价
  const calculateTotal = () => {
    let total = product.price;
    product.options?.forEach(option => {
      const selectedIndices = selections[option.name] || [];
      selectedIndices.forEach(index => {
        const choice = option.choices[index];
        if (choice && choice.priceDelta) {
          total += choice.priceDelta;
        }
      });
    });
    return total * quantity; // 虽然UI上隐藏了数量加减，但逻辑保留
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      {/* 
          Drawer Container:
          - items-end (mobile): 贴底显示
          - sm:items-center (desktop): 居中显示
          - rounded-t-[32px] (mobile): 仅顶部圆角，像抽屉
          - sm:rounded-[32px] (desktop): 全圆角，像卡片
          - max-h-[90vh]: 限制高度，不占满全屏
      */}
      <div 
        className="
            w-full max-w-[375px] bg-island-bg 
            rounded-t-[32px] sm:rounded-[32px] 
            shadow-2xl overflow-hidden relative
            flex flex-col
            max-h-[90vh] animate-slide-up
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* 错误提示 Toast */}
        {errorMsg && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-black/80 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-fade-in whitespace-nowrap">
                {errorMsg}
            </div>
        )}

        {/* 滚动内容区 */}
        <div className="overflow-y-auto no-scrollbar pb-24">
            
            {/* 顶部图片区域 - 1:1 或 4:3 比例 */}
            <div className="relative h-64 w-full shrink-0">
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                />
                {/* 顶部渐变遮罩，保证白色关闭按钮可见 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent h-20 pointer-events-none"></div>

                {/* 关闭按钮 - 悬浮在右上角 */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-20"
                >
                    <X size={18} />
                </button>
                
                {/* 装饰性粉色徽章 (还原截图中的粉色图标) */}
                <div className="absolute top-14 right-4 z-20">
                     <div className="w-8 h-8 rounded-full bg-[#E57373]/90 backdrop-blur flex items-center justify-center text-white shadow-sm border border-white/20">
                        <Heart size={14} fill="currentColor" />
                     </div>
                </div>
            </div>

            {/* 内容详情 */}
            <div className="px-5 pt-5">
                <h1 className="text-xl font-black text-island-dark mb-1 tracking-tight">{product.name}</h1>
                <p className="text-xs text-gray-500 leading-relaxed">
                    {product.description || '暂无描述'}
                </p>

                {/* 虚线分割线 */}
                <div className="border-t border-dashed border-gray-200 my-5"></div>

                {/* 规格选项 */}
                <div className="space-y-6">
                    {product.options?.map((option, idx) => (
                        <div key={idx}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-island-dark">
                                    {option.name}
                                </h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {option.choices.map((choice, choiceIdx) => {
                                    const isSelected = (selections[option.name] || []).includes(choiceIdx);
                                    const isSoldOut = !!choice.isSoldOut;
                                    
                                    return (
                                        <button
                                            key={choiceIdx}
                                            onClick={() => !isSoldOut && handleSelect(option.name, choiceIdx, !!option.required, option.maxSelection)}
                                            disabled={isSoldOut}
                                            className={`
                                                px-5 py-2 rounded-[14px] text-xs font-bold transition-all border
                                                ${isSoldOut
                                                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through' 
                                                    : isSelected 
                                                        ? 'bg-[#E2F5F0] border-[#E2F5F0] text-island-dark' // 选中态：淡青色背景
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300' // 未选中态
                                                }
                                            `}
                                        >
                                            {choice.label}
                                            {!isSoldOut && choice.priceDelta ? ` (+¥${choice.priceDelta})` : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 底部固定操作栏 */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-50 px-5 py-4 pb-6 sm:pb-4 flex items-center justify-between shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)] z-30">
            <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-island-dark">¥</span>
                <span className="text-3xl font-english font-black text-island-dark leading-none">
                    {calculateTotal()}
                </span>
            </div>

            <button 
                onClick={onClose}
                className="flex-1 ml-6 h-12 bg-island-dark text-white rounded-[16px] font-bold text-sm shadow-xl shadow-island-dark/20 flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-island-dark/90"
            >
                <Plus size={18} />
                <span>加入购物车</span>
            </button>
        </div>

        {/* 售罄遮罩 (全屏覆盖) */}
        {product.status === 'soldout' && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[55] flex flex-col items-center justify-center pointer-events-none rounded-[32px]">
                <div className="bg-black/80 text-white px-6 py-3 rounded-full font-bold shadow-2xl transform -rotate-6 border-2 border-white">
                    已售罄 Sold Out
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
