
import React, { useMemo, useRef, useState } from 'react';
import { Plus, Image as ImageIcon, X, Edit3, Trash2, Settings, Check, AlertCircle, Package, Eye, Ban, RotateCcw, ListChecks } from 'lucide-react';
import { MenuItem, ProductOption } from '../types';
import { ProductPreviewModal } from './ProductPreviewModal';

interface Props {
  categories: string[];
  products: MenuItem[];
  vendorId: string;
  onUpdateProducts: (products: MenuItem[]) => void;
}

type DialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
};

export const ProductManager: React.FC<Props> = ({ categories, products, vendorId, onUpdateProducts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'soldout'>('all');
  const [previewProduct, setPreviewProduct] = useState<MenuItem | null>(null);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '确认',
    cancelLabel: '取消',
    showCancel: true,
  });
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    category: categories.length > 0 ? categories[0] : '推荐',
    description: '',
    imageUrl: '',
    imageUrls: [],
    stockLimit: 0, // 0 means unlimited
    options: []
  });

  // --- CRUD Actions ---

  const resetForm = () => {
    setFormData({ name: '', price: 0, category: categories.length > 0 ? categories[0] : '推荐', description: '', imageUrl: '', imageUrls: [], stockLimit: 0, options: [] });
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: MenuItem) => {
    const nextImageUrls = product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];
    setFormData({
      ...product,
      imageUrls: nextImageUrls,
      options: JSON.parse(JSON.stringify(product.options || [])) // Deep copy to prevent mutating state directly
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const readImageFile = (file: File) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const selected = files.slice(0, 5);
    if (files.length > 5) {
      openAlert('图片数量已超限', '一次最多选择 5 张图片，已自动取前 5 张。');
    }
    const images = (await Promise.all(selected.map(readImageFile))).filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      imageUrls: images,
      imageUrl: images[0] || prev.imageUrl,
    }));
    event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const current = prev.imageUrls && prev.imageUrls.length > 0
        ? [...prev.imageUrls]
        : prev.imageUrl
          ? [prev.imageUrl]
          : [];
      current.splice(index, 1);
      return {
        ...prev,
        imageUrls: current,
        imageUrl: current[0] || '',
      };
    });
  };

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = '确认',
    cancelLabel = '取消'
  ) => {
    setDialog({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      showCancel: true,
      onConfirm,
    });
  };

  const openAlert = (title: string, message: string, confirmLabel = '知道了') => {
    setDialog({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel: '取消',
      showCancel: false,
      onConfirm: undefined,
    });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  };

  const handleDialogConfirm = () => {
    const action = dialog.onConfirm;
    closeDialog();
    action?.();
  };

  const handleSaveProduct = () => {
    if (!formData.name || !formData.price) return;
    const normalizedImageUrls = formData.imageUrls && formData.imageUrls.length > 0
      ? formData.imageUrls
      : formData.imageUrl
        ? [formData.imageUrl]
        : [];
    const primaryImageUrl = normalizedImageUrls[0];

    if (editingId) {
      // Edit Mode
      onUpdateProducts(products.map(p => {
        if (p.id === editingId) {
            // Check if stock limit should trigger soldout status
            const isNowSoldOut = (formData.stockLimit && formData.stockLimit > 0 && (p.dailySales || 0) >= formData.stockLimit);
            return { 
                ...p, 
                ...formData as MenuItem,
                imageUrl: primaryImageUrl || p.imageUrl,
                imageUrls: normalizedImageUrls.length > 0 ? normalizedImageUrls : p.imageUrls,
                status: isNowSoldOut ? 'soldout' : (formData.status || p.status) 
            };
        }
        return p;
      }));
    } else {
      // Create Mode
      const newProduct: MenuItem = {
        id: `p-${Date.now()}`,
        vendorId,
        name: formData.name!,
        price: Number(formData.price),
        description: formData.description || '',
        category: formData.category || (categories.length > 0 ? categories[0] : '未分类'),
        imageUrl: primaryImageUrl || formData.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop',
        imageUrls: normalizedImageUrls.length > 0 ? normalizedImageUrls : undefined,
        status: 'available',
        stockLimit: formData.stockLimit || 0,
        dailySales: 0,
        options: formData.options || []
      };
      onUpdateProducts([newProduct, ...products]);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteProduct = (id: string) => {
    openConfirm('删除商品', '确定要永久删除这个商品吗？删除后无法恢复。', () => {
      onUpdateProducts(products.filter(p => p.id !== id));
    }, '确认删除');
  };

  const handleToggleStatus = (id: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'available' ? 'soldout' : 'available';
    onUpdateProducts(products.map(p => 
      p.id === id ? { ...p, status: newStatus } : p
    ));
  };

  const handleResetAllSales = () => {
    onUpdateProducts(
      products.map(p => ({
        ...p,
        dailySales: 0,
        status: p.status === 'soldout' ? 'available' : p.status
      }))
    );
  };

  const handleResetSales = (id: string) => {
    openConfirm('重置今日销量', '确认重置该商品的当日销量吗？重置后将重新计算库存。', () => {
      onUpdateProducts(products.map(p =>
        p.id === id ? { ...p, dailySales: 0, status: 'available' } : p
      ));
    });
  };

  const handleResetSalesInEditor = () => {
    if (!editingId) return;
    openConfirm('重置今日销量', '确认将该商品今日销量清零并恢复为在售吗？', () => {
      onUpdateProducts(products.map(p =>
        p.id === editingId ? { ...p, dailySales: 0, status: 'available' } : p
      ));
      setFormData(prev => ({ ...prev, dailySales: 0, status: 'available' }));
    });
  };

  // --- Filter Logic ---
  const filteredProducts = products.filter(product => {
    if (activeTab === 'all') return true;
    return product.status === activeTab;
  });

  const statusCounts = useMemo(() => {
    const available = products.filter((product) => product.status !== 'soldout').length;
    const soldout = products.filter((product) => product.status === 'soldout').length;
    return {
      all: products.length,
      available,
      soldout,
    };
  }, [products]);

  // --- Spec Editor Handlers ---
  const addOptionGroup = () => {
    const currentOptions = formData.options || [];
    setFormData({
        ...formData,
        options: [
            // 将新规格组插入到数组最前面 (Prepend)
            { name: '', required: true, choices: [{ label: '', priceDelta: 0, isSoldOut: false }] },
            ...currentOptions,
        ]
    });
  };

  const removeOptionGroup = (index: number) => {
    const currentOptions = [...(formData.options || [])];
    currentOptions.splice(index, 1);
    setFormData({ ...formData, options: currentOptions });
  };

  const updateOptionGroup = (index: number, field: keyof ProductOption, value: any) => {
    const currentOptions = [...(formData.options || [])];
    currentOptions[index] = { ...currentOptions[index], [field]: value };
    setFormData({ ...formData, options: currentOptions });
  };

  const addChoiceToGroup = (groupIndex: number) => {
      const currentOptions = [...(formData.options || [])];
      currentOptions[groupIndex].choices.push({ label: '', priceDelta: 0, isSoldOut: false });
      setFormData({ ...formData, options: currentOptions });
  };

  const removeChoiceFromGroup = (groupIndex: number, choiceIndex: number) => {
      const currentOptions = [...(formData.options || [])];
      currentOptions[groupIndex].choices.splice(choiceIndex, 1);
      setFormData({ ...formData, options: currentOptions });
  };

  const updateChoice = (groupIndex: number, choiceIndex: number, field: 'label' | 'priceDelta' | 'isSoldOut', value: any) => {
      const currentOptions = [...(formData.options || [])];
      currentOptions[groupIndex].choices[choiceIndex] = {
          ...currentOptions[groupIndex].choices[choiceIndex],
          [field]: value
      };
      setFormData({ ...formData, options: currentOptions });
  };

  const currentImages = formData.imageUrls && formData.imageUrls.length > 0
    ? formData.imageUrls
    : formData.imageUrl
      ? [formData.imageUrl]
      : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          {[
            { id: 'all', label: '全部', count: statusCounts.all },
            { id: 'available', label: '在售', count: statusCounts.available },
            { id: 'soldout', label: '售罄', count: statusCounts.soldout }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                ? 'bg-island-dark text-white shadow-sm' 
                : 'text-text-secondary hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-2 text-[10px] font-black ${
                activeTab === tab.id ? 'text-white/90' : 'text-text-secondary/60'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              openConfirm(
                '重置全部销量',
                '确认将所有商品今日销量清零，并恢复为在售状态吗？',
                handleResetAllSales,
                '确认重置'
              )
            }
            className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-island-dark hover:bg-gray-50 transition-all active:scale-95"
            aria-label="重置全部销量"
            title="重置全部销量"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={handleOpenCreate}
            className="w-10 h-10 rounded-full bg-island-dark hover:bg-island-dark/90 text-white flex items-center justify-center shadow-lg shadow-island-dark/10 transition-all active:scale-95"
            aria-label="发布商品"
            title="发布商品"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20 no-scrollbar">
        {filteredProducts.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3">
                <AlertCircle size={24} className="text-gray-300" />
             </div>
             <p className="text-sm text-gray-400 font-bold">暂无商品</p>
           </div>
        ) : (
          filteredProducts.map(product => {
            const stockLimit = product.stockLimit || 0;
            const sales = product.dailySales || 0;
            const stockPercent = stockLimit > 0 ? Math.min(100, (sales / stockLimit) * 100) : 0;
            const isLowStock = stockLimit > 0 && (stockLimit - sales) <= 5 && (stockLimit - sales) > 0;
            const isOverLimit = stockLimit > 0 && sales >= stockLimit;

            return (
              <div key={product.id} className={`bg-white p-4 rounded-[24px] shadow-card border flex gap-4 transition-colors ${
                  product.status === 'soldout' ? 'border-gray-100 opacity-80' : 'border-white hover:border-island-primary/20'
              }`}>
                {/* Product Image */}
                <div className="w-24 h-24 rounded-[18px] bg-gray-50 shrink-0 overflow-hidden relative">
                   <img src={product.imageUrl} className={`w-full h-full object-cover ${product.status === 'soldout' ? 'grayscale' : ''}`} />
                   {product.status === 'soldout' && (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold backdrop-blur-sm">已售罄</div>
                   )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className={`font-bold text-base ${product.status === 'soldout' ? 'text-gray-500 line-through' : 'text-island-dark'}`}>
                          {product.name}
                      </h3>
                      
                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button 
                            onClick={() => setPreviewProduct(product)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-island-primary/10 hover:text-island-primary rounded-lg text-text-secondary transition-colors"
                            title="预览客户端效果"
                        >
                            <Eye size={14} />
                        </button>
                        <button 
                            onClick={() => handleOpenEdit(product)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-1 mt-1">{product.description}</p>
                    
                    {/* Tags & Stock */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                       <span className="text-[10px] bg-island-bg text-text-secondary px-2 py-0.5 rounded-md font-medium border border-island-mint/30">{product.category}</span>
                       
                       {/* Stock Indicator */}
                       {stockLimit > 0 && (
                           <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                               <Package size={10} className={isLowStock ? 'text-orange-500' : 'text-gray-400'} />
                               <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                   <div 
                                      className={`h-full rounded-full ${isLowStock ? 'bg-orange-400' : 'bg-island-primary'}`} 
                                      style={{ width: `${stockPercent}%` }}
                                   ></div>
                               </div>
                               <span className="text-[10px] text-text-secondary font-english">
                                   {sales}/{stockLimit}
                               </span>
                           </div>
                       )}
                       {stockLimit === 0 && (
                           <span className="text-[10px] text-gray-400 px-1">无限量</span>
                       )}
                       {isOverLimit && (
                           <button
                             onClick={() => handleResetSales(product.id)}
                             className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                           >
                             重置销量
                           </button>
                       )}
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <span className={`font-english font-bold text-lg ${product.status === 'soldout' ? 'text-gray-400' : 'text-island-dark'}`}>
                        ¥ {product.price}
                    </span>
                    
                    {/* Status Toggle Button */}
                    <button 
                      onClick={() => handleToggleStatus(product.id, product.status)}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                      product.status === 'available' 
                      ? 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100' 
                      : 'bg-island-primary text-white border-island-primary shadow-lg shadow-island-primary/20'
                    }`}>
                       {product.status === 'available' ? '设为售罄' : '恢复供应'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Product Preview Modal */}
      {previewProduct && (
        <ProductPreviewModal 
          product={previewProduct} 
          onClose={() => setPreviewProduct(null)} 
        />
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-island-dark/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-6 shadow-2xl animate-scale-up border border-white/50 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-lg font-bold text-island-dark">
                {editingId ? '编辑商品' : '发布新商品'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto no-scrollbar flex-1 pr-2">
              {/* Image Upload Placeholder */}
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full h-32 bg-island-bg border-2 border-dashed border-island-mint rounded-2xl flex flex-col items-center justify-center text-text-secondary cursor-pointer hover:bg-island-mint/30 transition-colors shrink-0 overflow-hidden relative"
              >
                {currentImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 w-full h-full p-2">
                      {currentImages.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="relative w-full h-full rounded-xl overflow-hidden bg-white">
                          <img src={url} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center"
                            aria-label="移除图片"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                ) : (
                    <>
                        <ImageIcon size={24} className="mb-2 opacity-50" />
                        <span className="text-xs font-medium">上传商品图片 (最多5张)</span>
                    </>
                )}
                <div className="absolute bottom-2 right-2 text-[10px] font-bold text-[#193b35]/60 bg-white/80 px-2 py-0.5 rounded-full">
                  {currentImages.length}/5
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">商品名称</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 ring-island-mint transition-all"
                      placeholder="例如：招牌椰子鸡"
                    />
                 </div>

                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">价格 (¥)</label>
                    <input 
                      type="number" 
                      value={formData.price || ''}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                      className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 ring-island-mint transition-all"
                      placeholder="0.00"
                    />
                 </div>

                 <div>
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">分类 (关联店铺设置)</label>
                    <div className="relative">
                        <select 
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 ring-island-mint transition-all appearance-none cursor-pointer"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          {categories.length === 0 && <option value="默认">默认</option>}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className="border-t-[5px] border-t-gray-400 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent inline-block"></span>
                        </div>
                    </div>
                 </div>
                 
                 <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block flex items-center justify-between">
                        <span>每日限量 (份)</span>
                        <span className="text-[10px] font-normal text-gray-400">0 表示不限量</span>
                    </label>
                    <div className="relative">
                        <Package size={16} className="absolute left-4 top-3 text-gray-400" />
                        <input 
                        type="number" 
                        value={formData.stockLimit || ''}
                        onChange={e => setFormData({...formData, stockLimit: parseInt(e.target.value) || 0})}
                        className="w-full h-12 bg-gray-50 rounded-xl pl-10 pr-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 ring-island-mint transition-all placeholder:text-gray-300"
                        placeholder="不限"
                        />
                    </div>
                    {editingId && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                        <span>今日已售：{formData.dailySales || 0}</span>
                        <button
                          type="button"
                          onClick={handleResetSalesInEditor}
                          className="text-emerald-700 font-bold px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                        >
                          重置今日销量
                        </button>
                      </div>
                    )}
                 </div>

                 <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary ml-1 mb-1 block">商品描述</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full h-20 bg-gray-50 rounded-xl p-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 ring-island-mint transition-all resize-none"
                      placeholder="介绍一下这道菜..."
                    />
                 </div>
              </div>

              {/* Specification Editor */}
              <div className="border-t border-dashed border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold text-island-dark flex items-center gap-2">
                        <Settings size={14} className="text-island-primary"/> 规格设置
                      </label>
                      <button 
                        onClick={addOptionGroup}
                        className="text-xs font-bold text-island-primary hover:bg-island-primary/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        + 添加规格组
                      </button>
                  </div>

                  <div className="space-y-4">
                    {(!formData.options || formData.options.length === 0) && (
                        <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                            <p className="text-xs text-text-secondary">暂无规格，点击上方按钮添加</p>
                            <p className="text-[10px] text-gray-400 mt-1">例如：大杯/中杯，甜度，加料等</p>
                        </div>
                    )}

                    {formData.options?.map((group, groupIndex) => (
                        <div key={groupIndex} className="bg-island-bg border border-island-mint/50 rounded-2xl p-4 relative group">
                            <button 
                                onClick={() => removeOptionGroup(groupIndex)}
                                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X size={14} />
                            </button>
                            
                            {/* Group Header */}
                            <div className="flex flex-col gap-3 mb-3 pr-8">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="规格名 (如: 甜度)" 
                                            value={group.name}
                                            onChange={(e) => updateOptionGroup(groupIndex, 'name', e.target.value)}
                                            className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold text-island-dark outline-none focus:border-island-primary/50"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                         <button 
                                            onClick={() => updateOptionGroup(groupIndex, 'required', !group.required)}
                                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                                                group.required 
                                                ? 'bg-island-dark text-white border-island-dark' 
                                                : 'bg-white text-gray-400 border-gray-200'
                                            }`}
                                         >
                                             {group.required ? <Check size={12} /> : <ListChecks size={12} />}
                                             {group.required ? '单选(必选)' : '多选(可选)'}
                                         </button>
                                    </div>
                                </div>
                                
                                {/* Max selection input for optional groups */}
                                {!group.required && (
                                    <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-gray-100">
                                        <span className="text-[10px] font-bold text-text-secondary">最多可选:</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            placeholder="不限"
                                            value={group.maxSelection || ''}
                                            onChange={(e) => updateOptionGroup(groupIndex, 'maxSelection', parseInt(e.target.value) || 0)}
                                            className="w-16 h-7 bg-white border border-gray-200 rounded px-2 text-xs text-center outline-none focus:border-island-primary/50"
                                        />
                                        <span className="text-[10px] text-gray-400">项 (0为不限)</span>
                                    </div>
                                )}
                            </div>

                            {/* Choices List */}
                            <div className="space-y-2">
                                {group.choices.map((choice, choiceIndex) => (
                                    <div key={choiceIndex} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                placeholder="选项 (如: 半糖)"
                                                value={choice.label}
                                                onChange={(e) => updateChoice(groupIndex, choiceIndex, 'label', e.target.value)}
                                                className={`w-full bg-white border rounded-lg px-3 py-1.5 text-xs text-island-dark outline-none focus:border-island-primary/50 ${choice.isSoldOut ? 'opacity-50 line-through border-gray-200' : 'border-gray-100'}`}
                                            />
                                        </div>
                                        <div className="w-20 relative">
                                            <span className="absolute left-2 top-1.5 text-xs text-gray-400">+¥</span>
                                            <input 
                                                type="number" 
                                                placeholder="0"
                                                value={choice.priceDelta || ''}
                                                onChange={(e) => updateChoice(groupIndex, choiceIndex, 'priceDelta', parseFloat(e.target.value))}
                                                disabled={!!choice.isSoldOut}
                                                className="w-full bg-white border border-gray-100 rounded-lg pl-7 pr-2 py-1.5 text-xs text-island-dark outline-none focus:border-island-primary/50 disabled:bg-gray-50"
                                            />
                                        </div>
                                        
                                        {/* Sold Out Toggle */}
                                        <button
                                          onClick={() => updateChoice(groupIndex, choiceIndex, 'isSoldOut', !choice.isSoldOut)}
                                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors border ${
                                            choice.isSoldOut
                                              ? 'bg-red-50 text-red-500 border-red-100'
                                              : 'bg-white text-green-600 border-gray-200 hover:bg-green-50 hover:border-green-100'
                                          }`}
                                          title={choice.isSoldOut ? "设为供应中" : "设为售罄"}
                                        >
                                          {choice.isSoldOut ? '售罄' : '供应'}
                                        </button>

                                        <button 
                                            onClick={() => removeChoiceFromGroup(groupIndex, choiceIndex)}
                                            className="p-1.5 text-gray-300 hover:text-red-400 rounded-md"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addChoiceToGroup(groupIndex)}
                                    className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:text-island-dark hover:border-island-dark/30 transition-colors mt-2"
                                >
                                    + 添加选项
                                </button>
                            </div>
                        </div>
                    ))}
                  </div>
              </div>

            </div>

            <button 
              onClick={handleSaveProduct}
              className="w-full h-12 bg-island-dark text-white rounded-xl font-bold mt-6 shadow-lg shadow-island-dark/10 active:scale-95 transition-transform shrink-0"
            >
              {editingId ? '保存更改' : '立即发布'}
            </button>
          </div>
        </div>
      )}

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-white/60">
            <div className="text-xs font-black tracking-[0.3em] uppercase text-[#193b35]/40">Notice</div>
            <h3 className="text-lg font-bold text-island-dark mt-2">{dialog.title}</h3>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              {dialog.message}
            </p>
            <div className="mt-5 flex items-center gap-3">
              {dialog.showCancel !== false && (
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 h-11 rounded-xl border border-gray-100 text-island-dark text-sm font-bold bg-white hover:bg-gray-50 transition-colors"
                >
                  {dialog.cancelLabel || '取消'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDialogConfirm}
                className="flex-1 h-11 rounded-xl bg-[#193b35] text-[#e2f3a6] text-sm font-bold shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all"
              >
                {dialog.confirmLabel || '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
