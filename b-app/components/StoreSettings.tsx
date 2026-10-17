
import React, { useEffect, useState, useRef } from 'react';
import { Camera, MapPin, Clock, Phone, Power, Printer, ChevronLeft, ChevronDown, ChevronUp, Save, Star, Heart, MoreHorizontal, ImageIcon, Plus, X, Search, ShieldCheck, Map, CornerDownRight, Utensils, GripVertical } from 'lucide-react';
import { MenuItem, AppConfig, Merchant } from '../types';

interface Props {
    categories: string[];
    onUpdateCategories: (cats: string[]) => void;
    products: MenuItem[]; // 接收真实商品数据用于预览
    onUpdateProducts?: (products: MenuItem[]) => void;
    config: AppConfig; // 接收应用配置
    merchantInfo?: Merchant;
    onUpdateMerchant?: (updates: Partial<Merchant>) => void | Promise<void>;
    categorySyncStatus?: 'idle' | 'saving' | 'success' | 'error';
    categorySyncMessage?: string;
}

const buildStoreInfo = (merchant?: Merchant) => {
  const fallbackCover =
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=600&auto=format&fit=crop';
  const fallbackLogo =
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=200&fit=crop';
  const fallbackLocation = '后海村';
  const fallbackShort = merchant?.locationShort || fallbackLocation;
  const imageUrl = merchant ? (merchant.imageUrl || '') : fallbackCover;
  const qualificationFallback = merchant?.qualificationImage || merchant?.qualifications?.[0] || '';

  return {
    name: merchant?.name || '后海村冲浪果汁',
    coverImage: imageUrl,
    logo: merchant?.imageUrl || fallbackLogo,
    locationShort: fallbackShort,
    distance: '120m',
    rating: merchant?.rating ?? 4.9,
    reviewCount: 856,
    fullAddress: merchant?.location || fallbackLocation,
    phone: merchant?.phone || '136****6666',
    paymentWechatQr: merchant?.paymentWechatQr || '',
    paymentAlipayQr: merchant?.paymentAlipayQr || '',
    hours: merchant?.businessHours || '09:30 - 23:30',
    slogan: merchant?.description || '现榨果汁不加香精，给你一口热带清爽。',
    positiveRate: 97,
    qualificationImage: qualificationFallback,
    qualificationUploadedAt: merchant?.qualificationUploadedAt || '',
    signImage: merchant?.signImage || '',
    signUploadedAt: merchant?.signUploadedAt || '',
    isOpen: merchant?.isOpen ?? true,
    autoPrint: true,
    autoAccept: false,
  };
};

export const StoreSettings: React.FC<Props> = ({
  categories,
  onUpdateCategories,
  products,
  onUpdateProducts,
  config,
  merchantInfo,
  onUpdateMerchant,
  categorySyncStatus = 'idle',
  categorySyncMessage = '',
}) => {
  const [storeInfo, setStoreInfo] = useState(() => buildStoreInfo(merchantInfo));

  useEffect(() => {
    setStoreInfo(buildStoreInfo(merchantInfo));
  }, [merchantInfo?.id]);

  // 使用 Props 中的分类
  const [newCategory, setNewCategory] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const saveStatusTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveStatusTimer.current) {
        window.clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = null;
      }
    };
  }, []);

  const pushSaveFeedback = (status: 'success' | 'error', message: string) => {
    setSaveStatus(status);
    setSaveMessage(message);
    if (saveStatusTimer.current) {
      window.clearTimeout(saveStatusTimer.current);
    }
    saveStatusTimer.current = window.setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 2400);
  };

  // Simulator State
  const [previewTab, setPreviewTab] = useState('点餐'); // 预览界面的顶部Tab
  const [activeCategory, setActiveCategory] = useState(categories[0] || '全部'); // 预览界面的分类Tab (主要用于顶部高亮，列表为长滚动)
  const [previewDetailProduct, setPreviewDetailProduct] = useState<MenuItem | null>(null); // 模拟器内商品详情
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true);

  // --- Drag and Drop State ---
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const qualificationInputRef = useRef<HTMLInputElement | null>(null);
  const signInputRef = useRef<HTMLInputElement | null>(null);

  const readImageFile = (file: File) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result);
      };
      reader.readAsDataURL(file);
    });

  const resizeImageFile = async (file: File, maxEdge: number) => {
    const dataUrl = await readImageFile(file);
    if (!dataUrl) return '';
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = Math.max(img.width, img.height);
        if (!maxSize || maxSize <= maxEdge) {
          resolve(dataUrl);
          return;
        }
        const scale = maxEdge / maxSize;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        const output =
          mime === 'image/jpeg' ? canvas.toDataURL(mime, 0.9) : canvas.toDataURL(mime);
        resolve(output);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const value = await resizeImageFile(file, 1600);
    if (value) {
      setStoreInfo((prev) => ({ ...prev, coverImage: value }));
    }
    event.target.value = '';
  };

  const clearCoverImage = () => {
    setStoreInfo((prev) => ({ ...prev, coverImage: '', logo: '' }));
  };

  const handleArchiveUpload = (
    type: 'qualification' | 'sign',
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploadedAt = new Date().toISOString();
    resizeImageFile(file, 1200).then((value) => {
      if (!value) return;
      setStoreInfo((prev) => ({
        ...prev,
        qualificationImage: type === 'qualification' ? value : prev.qualificationImage,
        qualificationUploadedAt:
          type === 'qualification' ? uploadedAt : prev.qualificationUploadedAt,
        signImage: type === 'sign' ? value : prev.signImage,
        signUploadedAt: type === 'sign' ? uploadedAt : prev.signUploadedAt,
      }));
    });
    event.target.value = '';
  };

  const clearArchiveImage = (type: 'qualification' | 'sign') => {
    setStoreInfo((prev) => ({
      ...prev,
      qualificationImage: type === 'qualification' ? '' : prev.qualificationImage,
      qualificationUploadedAt: type === 'qualification' ? '' : prev.qualificationUploadedAt,
      signImage: type === 'sign' ? '' : prev.signImage,
      signUploadedAt: type === 'sign' ? '' : prev.signUploadedAt,
    }));
  };

  const handleSave = async () => {
    if (!onUpdateMerchant) return;
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');
    if (saveStatusTimer.current) {
      window.clearTimeout(saveStatusTimer.current);
      saveStatusTimer.current = null;
    }
    try {
      const name = storeInfo.name.trim() || merchantInfo?.name || '';
      const previousLocation = merchantInfo?.location?.trim() || '';
      const fullAddress = storeInfo.fullAddress.trim();
      const location =
        (fullAddress && fullAddress !== previousLocation ? fullAddress : '') ||
        fullAddress ||
        previousLocation;
      const imageUrl = storeInfo.coverImage.trim();
      const payload: Partial<Merchant> = {
        name,
        imageUrl,
        location,
        locationShort: storeInfo.locationShort.trim(),
        businessHours: storeInfo.hours.trim(),
        phone: storeInfo.phone.trim(),
        paymentWechatQr: storeInfo.paymentWechatQr?.trim() ?? '',
        paymentAlipayQr: storeInfo.paymentAlipayQr?.trim() ?? '',
        description: storeInfo.slogan.trim(),
        qualificationImage: storeInfo.qualificationImage?.trim() ?? '',
        qualificationUploadedAt: storeInfo.qualificationUploadedAt || '',
        signImage: storeInfo.signImage?.trim() ?? '',
        signUploadedAt: storeInfo.signUploadedAt || '',
        isOpen: storeInfo.isOpen,
        menuCategories: categories,
      };
      await onUpdateMerchant(payload);
      pushSaveFeedback('success', '保存成功');
    } catch (error) {
      console.error('Failed to save merchant settings', error);
      pushSaveFeedback('error', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    const parts = storeInfo.hours.split(' - ');
    const currentStart = parts[0] || '09:00';
    const currentEnd = parts[1] || '22:00';

    if (type === 'start') {
        setStoreInfo({...storeInfo, hours: `${value} - ${currentEnd}`});
    } else {
        setStoreInfo({...storeInfo, hours: `${currentStart} - ${value}`});
    }
  };

  const updatePaymentQr = (type: 'wechat' | 'alipay', value: string) => {
    setStoreInfo((prev) => ({
      ...prev,
      paymentWechatQr: type === 'wechat' ? value : prev.paymentWechatQr,
      paymentAlipayQr: type === 'alipay' ? value : prev.paymentAlipayQr,
    }));
  };

  const clearPaymentQr = (type: 'wechat' | 'alipay') => {
    setStoreInfo((prev) => ({
      ...prev,
      paymentWechatQr: type === 'wechat' ? '' : prev.paymentWechatQr,
      paymentAlipayQr: type === 'alipay' ? '' : prev.paymentAlipayQr,
    }));
  };

  const handlePaymentQrUpload = async (type: 'wechat' | 'alipay', file?: File) => {
    if (!file) return;
    const result = await resizeImageFile(file, 800);
    updatePaymentQr(type, result);
  };

  const qualificationImage = storeInfo.qualificationImage?.trim();
  const signImage = storeInfo.signImage?.trim();
  const hasQualification = Boolean(qualificationImage);
  const hasSign = Boolean(signImage);
  const archiveTitle = hasQualification && hasSign
    ? '招牌&资质'
    : hasSign
      ? '招牌'
      : hasQualification
        ? '相关资质'
        : '经营档案';
  const archiveItems = [
    ...(hasSign ? [{ label: '招牌', image: signImage, uploadedAt: storeInfo.signUploadedAt }] : []),
    ...(hasQualification ? [{ label: '相关资质', image: qualificationImage, uploadedAt: storeInfo.qualificationUploadedAt }] : []),
  ];
  const formatUploadTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('zh-CN');
  };

  // 分类管理逻辑
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      onUpdateCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    const nextCategories = categories.filter(c => c !== cat);
    const visibleCategories = nextCategories.filter(c => c !== '全部');
    const fallbackCategory = visibleCategories[0] || '默认分类';
    const finalCategories =
      visibleCategories.length === 0 && !nextCategories.includes(fallbackCategory)
        ? [...nextCategories, fallbackCategory]
        : nextCategories;
    onUpdateCategories(finalCategories);

    if (!onUpdateProducts) return;
    const hasAffected = products.some(p => p.category === cat);
    if (!hasAffected) return;
    const updatedProducts = products.map(p =>
      p.category === cat ? { ...p, category: fallbackCategory } : p
    );
    onUpdateProducts(updatedProducts);
  };

  // --- 拖拽排序处理函数 ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    // 设置拖拽时的视觉效果（变透明）
    e.currentTarget.style.opacity = '0.4';
    e.currentTarget.classList.add('scale-105', 'shadow-lg');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault(); // 必须阻止默认行为才能触发 drop
    
    if (dragItem.current === null) return;
    
    // 如果拖拽到了一个新的位置
    if (dragItem.current !== position) {
        const newCategories = [...categories];
        
        // 取出被拖拽的元素
        const draggedItemContent = newCategories[dragItem.current];
        
        // 在原位置删除
        newCategories.splice(dragItem.current, 1);
        
        // 在新位置插入
        newCategories.splice(position, 0, draggedItemContent);
        
        // 更新引用位置，以便连续拖拽
        dragItem.current = position;
        
        // 更新状态
        onUpdateCategories(newCategories);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // 恢复样式
    e.currentTarget.style.opacity = '1';
    e.currentTarget.classList.remove('scale-105', 'shadow-lg');
    dragItem.current = null;
    dragOverItem.current = null;
  };


  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 pb-20 overflow-y-auto no-scrollbar relative">
      
      {/* --- 左侧：实时预览 (Skyline Style) --- */}
      {/* FIX: 移动端移除 sticky, 增加 w-full 和 max-w 限制，调整 z-index 防止遮挡 */}
      <div className="lg:w-[375px] w-full shrink-0 flex flex-col items-center lg:sticky lg:top-0 relative z-0">
         <button
           type="button"
           onClick={() => setIsPreviewCollapsed((prev) => !prev)}
           className="text-sm font-bold text-text-secondary mb-4 flex items-center gap-2"
         >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>客户端实时预览 (受配置控制)</span>
            {isPreviewCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
         </button>
         
         {isPreviewCollapsed ? (
           <div className="w-full max-w-[340px] rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-6 py-10 text-center text-xs font-bold text-slate-500">
             预览已折叠，点击上方标题展开
           </div>
         ) : (
         /* 模拟手机外框 */
         <div className="w-full max-w-[340px] h-[700px] bg-[#F5F7F6] rounded-[40px] border-[8px] border-island-dark overflow-hidden relative shadow-2xl flex flex-col mx-auto">
            {/* 顶部状态栏占位 */}
            <div className="absolute top-0 left-0 right-0 h-7 z-30 flex justify-between px-6 items-center pointer-events-none">
                 <span className="text-[10px] font-medium text-white drop-shadow-md">14:30</span>
                 <div className="flex gap-1">
                     <div className="w-4 h-2.5 bg-white rounded-[2px] border border-white/30"></div>
                 </div>
            </div>

            {/* 顶部导航按钮 */}
            <div className="absolute top-10 left-4 z-30 w-8 h-8 bg-black/20 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/20">
                <ChevronLeft size={18} />
            </div>
            <div className="absolute top-10 right-4 z-30 flex gap-2">
                 <div className="h-8 px-3 bg-white/90 backdrop-blur rounded-full flex items-center justify-center gap-3 border border-gray-200/50">
                    <MoreHorizontal size={16} className="text-black" />
                    <div className="w-[1px] h-3 bg-gray-300"></div>
                    <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    </div>
                 </div>
            </div>

            {/* --- 核心内容区 --- */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#FBFEFD]">
                
                {/* 1. 顶部大图 & 信息 */}
                <div className="relative h-[240px] w-full shrink-0">
                    <img src={storeInfo.coverImage} className="w-full h-full object-cover" />
                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>
                    
                    {/* 悬浮信息 */}
                    <div className="absolute bottom-4 left-4 text-white z-10 pr-20">
                        <h2 className="text-2xl font-black tracking-wide drop-shadow-lg mb-1 leading-tight">{storeInfo.name}</h2>
                        <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                           <div className="bg-[#D9F578] text-island-dark px-1.5 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5">
                                <Star size={10} fill="currentColor" /> {storeInfo.rating}
                           </div>
                           <span className="drop-shadow-md flex items-center gap-0.5">
                                <MapPin size={10} /> {storeInfo.locationShort} {storeInfo.distance}
                           </span>
                        </div>
                    </div>

                    <div className="absolute bottom-4 right-4 z-10">
                         <div className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30">
                             <Heart size={18} />
                         </div>
                    </div>
                    
                    {/* 营业时间Tag */}
                    <div className="absolute top-20 left-4 bg-white/20 backdrop-blur-md border border-white/30 px-2 py-1 rounded-full flex items-center gap-1">
                        <img src={storeInfo.logo} className="w-4 h-4 rounded-full object-cover" />
                        <span className="text-[10px] text-white font-bold">椰香浓郁</span>
                    </div>
                </div>

                {/* 2. 导航栏 (Sticky 效果模拟) */}
                <div className="sticky top-0 z-20 bg-[#FBFEFD] px-4 pt-2 pb-1 border-b border-gray-50/50">
                    <div className="flex gap-6 mb-3">
                        {['点餐', config.enableClientReviews ? '评价' : null, '详情'].filter(Boolean).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setPreviewTab(tab!)}
                                className={`text-sm font-bold relative pb-1 transition-colors ${
                                    previewTab === tab ? 'text-island-dark' : 'text-gray-400'
                                }`}
                            >
                                {tab}
                                {tab === '评价' && <span className="text-[10px] ml-1 bg-island-mint/50 px-1 rounded text-island-dark">856</span>}
                                {previewTab === tab && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-island-dark rounded-full"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* 3. 分类标签 (横向滚动) - 仅在点餐页显示 */}
                    {previewTab === '点餐' && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {categories.filter(c => c !== '全部').map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)} // 实际逻辑应为滚动到锚点，这里仅模拟高亮
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                        activeCategory === cat 
                                        ? 'bg-island-mint text-island-dark shadow-sm' 
                                        : 'bg-white border border-gray-100 text-gray-500'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- 4. Tab Content Views --- */}
                
                {/* 4.1 点餐 Tab (重构：长列表分组显示) */}
                {previewTab === '点餐' && (
                    <div className="px-4 py-2 space-y-2 pb-20">
                        {categories.filter(c => c !== '全部').map((category) => {
                            // 筛选该分类下的商品
                            const catProducts = products.filter(p => p.category === category);
                            
                            // 如果该分类下没有商品，则不显示该分组
                            if (catProducts.length === 0) return null;

                            return (
                                <div key={category} className="mb-6 last:mb-0">
                                    {/* 分类标题头 */}
                                    <div className="flex items-center gap-2 mb-3 sticky top-[84px] z-10 bg-[#FBFEFD]/95 backdrop-blur-sm py-2 -mx-4 px-4 border-b border-gray-50/50">
                                         <div className="w-5 h-5 rounded-full bg-island-mint/50 flex items-center justify-center text-island-dark text-[10px] font-bold">
                                            <Utensils size={10} />
                                         </div>
                                         <h3 className="font-black text-island-dark text-sm">{category}</h3>
                                    </div>

                                    {/* 该分类下的商品列表 */}
                                    <div className="space-y-4">
                                        {catProducts.map((prod) => (
                                            <div 
                                                key={prod.id} 
                                                onClick={() => setPreviewDetailProduct(prod)}
                                                className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-50 flex gap-3 active:scale-95 transition-transform cursor-pointer"
                                            >
                                                <div className="w-24 h-24 rounded-[16px] overflow-hidden shrink-0 bg-gray-100 relative">
                                                    <img src={prod.imageUrl} className="w-full h-full object-cover" />
                                                    {prod.status === 'soldout' && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">已售罄</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <h4 className={`font-bold text-sm leading-tight ${prod.status === 'soldout' ? 'text-gray-400' : 'text-island-dark'}`}>{prod.name}</h4>
                                                            {prod.status !== 'soldout' && (
                                                                <div className="w-6 h-6 rounded-full bg-island-dark text-white flex items-center justify-center shadow-md shadow-island-dark/20">
                                                                    <Plus size={14} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{prod.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`font-english font-bold text-lg ${prod.status === 'soldout' ? 'text-gray-400' : 'text-island-dark'}`}>¥{prod.price}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {products.length === 0 && (
                             <div className="text-center py-10 text-gray-300 text-xs">暂无商品，请在右侧添加</div>
                        )}
                    </div>
                )}

                {/* 4.2 评价 Tab */}
                {previewTab === '评价' && config.enableClientReviews && (
                    <div className="px-4 py-2 pb-20">
                         {/* 评价统计 */}
                         <div className="flex gap-4 items-center mb-6">
                            <div className="text-center">
                                <div className="text-3xl font-english font-black text-island-primary">{storeInfo.rating}</div>
                                <div className="text-[10px] text-gray-400 font-medium">商家评分</div>
                            </div>
                            <div className="flex-1">
                                <div className="flex gap-2 text-xs mb-1">
                                    <span className="text-gray-500">口味</span>
                                    <span className="font-bold text-island-dark">4.9</span>
                                </div>
                                <div className="flex gap-2 text-xs mb-1">
                                    <span className="text-gray-500">包装</span>
                                    <span className="font-bold text-island-dark">4.8</span>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <span className="text-gray-500">配送</span>
                                    <span className="font-bold text-island-dark">4.9</span>
                                </div>
                            </div>
                            <div className="text-center border-l border-gray-100 pl-4">
                                <div className="text-xl font-english font-bold text-island-dark">{storeInfo.positiveRate}%</div>
                                <div className="text-[10px] text-gray-400 font-medium">好评率</div>
                            </div>
                         </div>

                         {/* 评价标签 */}
                         <div className="flex flex-wrap gap-2 mb-6">
                            {['全部', '最新', '好评(800+)', '有图(120)'].map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-bold border border-gray-100">{tag}</span>
                            ))}
                         </div>

                         {/* 模拟评价列表 */}
                         <div className="space-y-6">
                             {/* 评价1: 有回复 */}
                             <div className="border-b border-gray-50 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-island-dark">冲浪小王子</div>
                                            <div className="text-[10px] text-gray-300">2023.10.25</div>
                                        </div>
                                    </div>
                                    <div className="flex text-yellow-400">
                                        {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed mb-2 pl-10">
                                    清补凉味道很正宗，椰奶味很浓郁！老板人也很好，下次还来。
                                </div>
                                <div className="pl-10 grid grid-cols-3 gap-2 mb-3">
                                    <img src="https://images.unsplash.com/photo-1563583769690-d28163043363?w=100&h=100&fit=crop" className="rounded-lg w-full h-20 object-cover" />
                                </div>
                                {/* 商家回复 */}
                                <div className="ml-10 bg-gray-50 rounded-lg p-2 text-[10px] text-gray-500 leading-relaxed relative">
                                    <span className="font-bold text-island-dark block mb-1">商家回复：</span>
                                    感谢亲的好评！我们在选材上一直坚持用最新鲜的老椰，期待您的下次光临～
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-50 rotate-45"></div>
                                </div>
                             </div>

                              {/* 评价2 */}
                              <div className="border-b border-gray-50 pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-island-dark">Alice</div>
                                            <div className="text-[10px] text-gray-300">2023.10.24</div>
                                        </div>
                                    </div>
                                    <div className="flex text-yellow-400">
                                        {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600 leading-relaxed mb-2 pl-10">
                                    烤生蚝非常新鲜，个头也大。
                                </div>
                             </div>
                         </div>
                    </div>
                )}

                {/* 4.3 详情 Tab (渲染真实数据) */}
                {previewTab === '详情' && (
                    <div className="px-4 py-4 space-y-6 pb-20">
                        {/* 地图/地址 */}
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-island-dark shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-bold text-island-dark">{storeInfo.fullAddress}</div>
                                </div>
                                {config.showContactPhone && (
                                    <div className="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-island-primary">
                                        <Phone size={14} />
                                    </div>
                                )}
                            </div>
                            {/* 模拟地图块 */}
                            <div className="w-full h-24 bg-gray-100 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100">
                                <Map size={24} className="text-gray-300 mb-1" />
                                <span className="text-[10px] text-gray-400 absolute bottom-2">地图预览区域</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-50"></div>

                        {/* 营业信息 */}
                        {(config.showBusinessHours) && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-island-dark">营业信息</h4>
                                {config.showBusinessHours && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Clock size={14} className="text-gray-400" />
                                        <span>营业时间：{storeInfo.hours}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <ShieldCheck size={14} className="text-gray-400" />
                                    <span>食品安全档案已公示</span>
                                </div>
                            </div>
                        )}
                        
                        {/* 经营档案预览 - 资质开关控制 */}
                        {config.showQualifications && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-island-dark">{archiveTitle}</h4>
                                {archiveItems.length === 0 ? (
                                    <div className="w-full h-20 rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-400 border border-gray-100">
                                        暂无上传
                                    </div>
                                ) : (
                                    <div className={`grid gap-2 ${archiveItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {archiveItems.map((item, idx) => (
                                            <div key={`${item.label}-${idx}`} className="relative w-full h-20 rounded-lg overflow-hidden bg-gray-100">
                                                <img src={item.image || ''} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-1 left-1 right-1 bg-white/80 text-[10px] font-bold text-island-dark px-2 py-0.5 rounded">
                                                    {item.label}
                                                    {item.uploadedAt ? ` · ${formatUploadTime(item.uploadedAt)}` : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 摊主寄语 */}
                        {storeInfo.slogan && config.showMerchantSlogan && (
                            <div className="bg-island-mint/20 p-4 rounded-xl relative">
                                <div className="absolute top-0 left-0 text-3xl text-island-primary/20 font-serif ml-2 -mt-2">“</div>
                                <p className="text-xs font-medium text-island-dark leading-relaxed relative z-10 text-center px-2">
                                    {storeInfo.slogan}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 5. 模拟器内商品详情弹窗 --- */}
                {previewDetailProduct && (
                    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-slide-up">
                        {/* 图片头 */}
                        <div className="relative h-64 shrink-0">
                            <img src={previewDetailProduct.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black/30 to-transparent"></div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewDetailProduct(null); }}
                                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        </div>
                        {/* 详情内容 */}
                        <div className="flex-1 p-5 -mt-6 bg-white rounded-t-[24px] relative">
                             <h2 className="text-xl font-black text-island-dark mb-1">{previewDetailProduct.name}</h2>
                             <div className="text-xs text-gray-400 mb-4 flex items-center gap-2">
                                <span>月售 {previewDetailProduct.dailySales}</span>
                                {previewDetailProduct.stockLimit && <span>库存 {previewDetailProduct.stockLimit}</span>}
                             </div>
                             
                             <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                {previewDetailProduct.description || '暂无详细描述...'}
                             </p>

                             {/* 规格展示 */}
                             {previewDetailProduct.options && previewDetailProduct.options.length > 0 && (
                                <div className="space-y-4 mb-8">
                                    {previewDetailProduct.options.map((opt, i) => (
                                        <div key={i}>
                                            <div className="text-xs font-bold text-island-dark mb-2">{opt.name}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {opt.choices.map((c, ci) => (
                                                    <span key={ci} className="px-3 py-1 rounded-lg bg-gray-50 text-xs text-gray-600 border border-gray-100">
                                                        {c.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                        {/* 底部按钮 */}
                        <div className="p-4 border-t border-gray-50 flex items-center justify-between pb-8 bg-white">
                             <div className="text-2xl font-english font-black text-island-dark">
                                <span className="text-sm font-bold">¥</span>{previewDetailProduct.price}
                             </div>
                             <button className="bg-island-dark text-white px-8 py-3 rounded-[16px] font-bold text-sm shadow-lg shadow-island-dark/20">
                                加入购物车
                             </button>
                        </div>
                    </div>
                )}

            </div>
            
            {/* 底部横条指示器 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full z-40"></div>
         </div>
         )}
      </div>


      {/* --- 右侧：编辑表单 --- */}
      <div className="flex-1 space-y-6 max-w-3xl">
        
        {/* Category Management - NEW SECTION */}
        <div className="bg-white rounded-[24px] p-6 shadow-card border border-white">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-island-dark flex items-center gap-2">
                    <div className="w-1 h-4 bg-island-primary rounded-full"></div>
                    菜单分类管理 (前端主页显示)
                </h3>
                {categorySyncStatus !== 'idle' && (
                  <span
                    className={`text-[10px] font-semibold ${
                      categorySyncStatus === 'success'
                        ? 'text-emerald-600'
                        : categorySyncStatus === 'error'
                          ? 'text-red-500'
                          : 'text-slate-400'
                    }`}
                  >
                    {categorySyncMessage}
                  </span>
                )}
            </div>
            
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="输入新分类名称 (如: 夏日限定)"
                        className="flex-1 h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button 
                        onClick={handleAddCategory}
                        className="h-11 px-6 bg-island-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-island-dark/10 hover:bg-island-dark/90 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} /> 添加
                    </button>
                </div>

                {/* Category Chips List (Draggable) */}
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 min-h-[80px]">
                    {categories.length === 0 && (
                        <p className="text-gray-400 text-xs w-full text-center py-2">暂无分类，请添加</p>
                    )}
                    {categories.map((cat, idx) => (
                        <div 
                            key={cat} // 使用 category string 作为 key，因为它是唯一的
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnter={(e) => handleDragEnter(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()} // 必要的
                            className="group relative bg-white border border-gray-200 pl-2 pr-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm hover:border-island-primary transition-all cursor-move select-none"
                        >
                            <GripVertical size={14} className="text-gray-300 group-hover:text-island-primary/50 transition-colors" />
                            <span className="text-sm font-bold text-island-dark">{cat}</span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // 防止触发拖拽事件
                                    handleRemoveCategory(cat);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors ml-1"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <GripVertical size={10} /> 拖拽标签即可调整前台显示顺序。
                </p>
            </div>
        </div>

        {/* Visual Settings */}
        <div className="bg-white rounded-[24px] p-6 shadow-card border border-white">
            <h3 className="text-sm font-bold text-island-dark mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-[#FFD166] rounded-full"></div>
                视觉装修
            </h3>
            
            <div className="space-y-4">
                {/* Cover Image Upload */}
                <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-2 block">店铺封面图 (背景大图)</label>
                                        <div
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-island-primary/50 transition-colors"
                    >
                        {storeInfo.coverImage && (
                          <img
                            src={storeInfo.coverImage}
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none"
                          />
                        )}
                        <div className="relative z-10 flex flex-col items-center">
                            <Camera size={20} className="text-island-dark mb-1" />
                            <span className="text-xs font-bold text-island-dark">{'\u70b9\u51fb\u66ff\u6362\u5c01\u9762'}</span>
                        </div>
                        {storeInfo.coverImage && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearCoverImage();
                            }}
                            className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 border border-gray-200 rounded-full px-2 py-1 text-gray-500 hover:text-red-500 hover:border-red-200"
                          >
                            {'\u6e05\u9664'}
                          </button>
                        )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">{'\u5e97\u94fa\u540d\u79f0'}</label>
                    <input 
                      type="text" 
                      value={storeInfo.name}
                      onChange={e => setStoreInfo({...storeInfo, name: e.target.value})}
                      className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">{'\u77ed\u5730\u5740 (\u663e\u793a\u5728\u5c01\u9762)'}</label>
                    <input 
                      type="text" 
                      value={storeInfo.locationShort}
                      onChange={e => setStoreInfo({...storeInfo, locationShort: e.target.value})}
                      className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">{'\u8054\u7cfb\u7535\u8bdd'}</label>
                    <input 
                      type="text" 
                      value={storeInfo.phone}
                      onChange={e => setStoreInfo({...storeInfo, phone: e.target.value})}
                      className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all font-english"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">营业时间</label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input 
                                type="time"
                                value={storeInfo.hours.split(' - ')[0] || ''}
                                onChange={(e) => handleTimeChange('start', e.target.value)}
                                className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all font-english"
                            />
                        </div>
                        <span className="text-gray-300 font-bold">-</span>
                        <div className="relative flex-1">
                             <input 
                                type="time"
                                value={storeInfo.hours.split(' - ')[1] || ''}
                                onChange={(e) => handleTimeChange('end', e.target.value)}
                                className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all font-english"
                            />
                        </div>
                    </div>
                 </div>
                 <div className="col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">详细地址 (用于详情页显示)</label>
                    <input 
                      type="text" 
                      value={storeInfo.fullAddress}
                      onChange={e => setStoreInfo({...storeInfo, fullAddress: e.target.value})}
                      className="w-full h-11 bg-island-bg rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all"
                    />
                 </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">摊主寄语 (Slogan)</label>
                 <textarea 
                   value={storeInfo.slogan}
                   onChange={e => setStoreInfo({...storeInfo, slogan: e.target.value})}
                   className="w-full h-20 bg-island-bg rounded-xl p-3 text-sm font-medium text-island-dark outline-none focus:ring-2 ring-island-mint transition-all resize-none"
                   placeholder="给顾客的一句话..."
                 />
              </div>
           </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-[24px] p-6 shadow-card border border-white">
            <h3 className="text-sm font-bold text-island-dark mb-4 flex items-center gap-2">
             <div className="w-1 h-4 bg-[#8ED6D6] rounded-full"></div>
             支付设置
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary ml-1">微信收款码</label>
                    <label className="h-28 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden relative group">
                        {storeInfo.paymentWechatQr ? (
                            <img src={storeInfo.paymentWechatQr} className="absolute inset-0 w-full h-full object-contain bg-white pointer-events-none" />
                        ) : (
                            <div className="relative z-10 flex flex-col items-center text-gray-400 text-xs font-bold">
                                <ImageIcon size={18} />
                                点击上传
                            </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handlePaymentQrUpload('wechat', e.target.files?.[0]);
                            e.currentTarget.value = '';
                          }}
                        />
                    </label>
                    {storeInfo.paymentWechatQr && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearPaymentQr('wechat');
                        }}
                        className="text-[10px] font-bold text-gray-500 hover:text-red-500 self-start"
                      >
                        {'\u6e05\u9664'}
                      </button>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary ml-1">支付宝收款码</label>
                    <label className="h-28 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden relative group">
                        {storeInfo.paymentAlipayQr ? (
                            <img src={storeInfo.paymentAlipayQr} className="absolute inset-0 w-full h-full object-contain bg-white pointer-events-none" />
                        ) : (
                            <div className="relative z-10 flex flex-col items-center text-gray-400 text-xs font-bold">
                                <ImageIcon size={18} />
                                点击上传
                            </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handlePaymentQrUpload('alipay', e.target.files?.[0]);
                            e.currentTarget.value = '';
                          }}
                        />
                    </label>
                    {storeInfo.paymentAlipayQr && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearPaymentQr('alipay');
                        }}
                        className="text-[10px] font-bold text-gray-500 hover:text-red-500 self-start"
                      >
                        {'\u6e05\u9664'}
                      </button>
                    )}
                </div>
           </div>
        </div>

        {/* Licenses & Photos */}
        <div className="bg-white rounded-[24px] p-6 shadow-card border border-white">
            <h3 className="text-sm font-bold text-island-dark mb-4 flex items-center gap-2">
             <div className="w-1 h-4 bg-gray-400 rounded-full"></div>
             经营档案 (图片)
           </h3>
           <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary ml-1">相关资质</label>
                    <div
                      onClick={() => qualificationInputRef.current?.click()}
                      className="h-24 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden relative group"
                    >
                        {storeInfo.qualificationImage && (
                          <img
                            src={storeInfo.qualificationImage}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          />
                        )}
                         <div className="relative z-10 bg-white/80 p-1.5 rounded-lg shadow-sm">
                            <ImageIcon size={16} className="text-gray-500" />
                        </div>
                        {storeInfo.qualificationImage && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearArchiveImage('qualification');
                            }}
                            className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 border border-gray-200 rounded-full px-2 py-1 text-gray-500 hover:text-red-500 hover:border-red-200"
                          >
                            {'\u6e05\u9664'}
                          </button>
                        )}
                    </div>
                    {storeInfo.qualificationUploadedAt && (
                      <div className="text-[10px] text-gray-400 ml-1">
                        上传于 {formatUploadTime(storeInfo.qualificationUploadedAt)}
                      </div>
                    )}
                    <input
                      ref={qualificationInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleArchiveUpload('qualification', event)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-text-secondary ml-1">招牌</label>
                    <div
                      onClick={() => signInputRef.current?.click()}
                      className="h-24 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden relative group"
                    >
                        {storeInfo.signImage && (
                          <img
                            src={storeInfo.signImage}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          />
                        )}
                        <div className="relative z-10 bg-white/80 p-1.5 rounded-lg shadow-sm">
                            <ImageIcon size={16} className="text-gray-500" />
                        </div>
                        {storeInfo.signImage && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              clearArchiveImage('sign');
                            }}
                            className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 border border-gray-200 rounded-full px-2 py-1 text-gray-500 hover:text-red-500 hover:border-red-200"
                          >
                            {'\u6e05\u9664'}
                          </button>
                        )}
                    </div>
                    {storeInfo.signUploadedAt && (
                      <div className="text-[10px] text-gray-400 ml-1">
                        上传于 {formatUploadTime(storeInfo.signUploadedAt)}
                      </div>
                    )}
                    <input
                      ref={signInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleArchiveUpload('sign', event)}
                    />
                </div>
           </div>
        </div>

        {/* Operation Settings (Bottom Toggles) */}
        <div className="bg-white rounded-[24px] p-6 shadow-card border border-white">
           <h3 className="text-sm font-bold text-island-dark mb-4 flex items-center gap-2">
             <div className="w-1 h-4 bg-orange-400 rounded-full"></div>
             系统开关
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Toggle Item */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-island-bg border border-transparent hover:border-island-primary/20 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${storeInfo.isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                       <Power size={16} />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-island-dark">营业状态</div>
                    </div>
                 </div>
                 <button 
                   onClick={() => setStoreInfo({...storeInfo, isOpen: !storeInfo.isOpen})}
                   className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative ${storeInfo.isOpen ? 'bg-green-500' : 'bg-gray-200'}`}
                 >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${storeInfo.isOpen ? 'translate-x-4' : 'translate-x-0'}`}></div>
                 </button>
              </div>

               <div className="flex items-center justify-between p-3 rounded-xl bg-island-bg border border-transparent hover:border-island-primary/20 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-island-sidebar flex items-center justify-center text-island-dark">
                       <Printer size={16} />
                    </div>
                    <div>
                       <div className="text-sm font-bold text-island-dark">自动打印</div>
                    </div>
                 </div>
                 <button 
                   onClick={() => setStoreInfo({...storeInfo, autoPrint: !storeInfo.autoPrint})}
                   className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative ${storeInfo.autoPrint ? 'bg-island-primary' : 'bg-gray-200'}`}
                 >
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${storeInfo.autoPrint ? 'translate-x-4' : 'translate-x-0'}`}></div>
                 </button>
              </div>
           </div>
        </div>

        {saveStatus !== 'idle' && (
          <div
            className={`text-xs font-semibold text-center ${
              saveStatus === 'success' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {saveMessage}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="sticky bottom-4 w-full py-4 bg-island-dark text-white rounded-[20px] font-bold text-base shadow-xl shadow-island-dark/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 z-50"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              保存设置中...
            </>
          ) : (
            <>
              <Save size={20} />
              保存并发布到小程序
            </>
          )}
        </button>

      </div>

    </div>
  );
};
