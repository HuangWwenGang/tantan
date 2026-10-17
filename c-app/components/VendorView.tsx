import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Vendor, MenuItem, CartState, SpecSelection, AppConfig } from '../types';
import { calculateItemPrice } from '../utils/pricing';
import { 
  ChevronLeft, Star, MapPin, Clock, Flame, 
  Plus, Minus, ShoppingBag, X, Heart, MessageSquare, Info,
  Phone, ShieldCheck, Store, Award, ExternalLink
} from 'lucide-react';
import { PalmLeafIcon, ShellIcon, CoconutIcon, CrabIcon, ShrimpIcon, StarfishIcon, BubblesIcon, SunIcon, CoconutTreeIcon } from './Icons';
import { getSoldOutProductIds, isVendorClosed } from '../utils/availability';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { StatePanel } from './StatePanel';
import { PullToRefresh } from './PullToRefresh';

interface VendorViewProps {
  vendor: Vendor;
  products: MenuItem[];
  cart: CartState;
  appConfig?: AppConfig;
  onBack: () => void;
  onUpdateCart: (product: MenuItem, delta: number, specs?: SpecSelection[]) => void;
  onOpenCart: () => void;
  onRefresh?: () => void | Promise<void>;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const DEFAULT_MENU_CATEGORIES = ['招牌', '甜品', '烧烤', '饮品'];

const SHOW_RATINGS = false;

const REVIEW_TAGS = [
  { label: '全部', count: 856 },
  { label: '最新', count: 12 },
  { label: '好评', count: 820 },
  { label: '有图', count: 156 },
  { label: '味道赞', count: 432 },
  { label: '回头客', count: 210 },
];

const MOCK_REVIEWS = [
  {
    id: 1,
    userName: "冲浪小王子",
    userAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100&h=100",
    rating: 5,
    date: "昨天",
    content: "味道真的绝了！椰子鸡汤非常鲜甜，鸡肉很嫩。老板娘人也超级好，送了蘸料。以后来后海只吃这一家！强烈推荐！",
    images: [
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=200&h=200",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=200&h=200"
    ],
    tags: ["味道赞", "食材新鲜", "分量足"]
  },
  {
    id: 2,
    userName: "IslandGirl",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100&h=100",
    rating: 4,
    date: "2天前",
    content: "清补凉料很足，就是稍微有点甜。不过在这种天气吃一碗真的很爽。",
    tags: ["性价比高", "清凉解暑"]
  }
];

const formatUploadTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const VendorView: React.FC<VendorViewProps> = ({
  vendor,
  products,
  cart,
  appConfig,
  onBack,
  onUpdateCart,
  onOpenCart,
  onRefresh,
  isFavorite,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'details'>('menu');
  const [activeCategory, setActiveCategory] = useState('招牌必吃');
  const [activeReviewTag, setActiveReviewTag] = useState('全部');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [navAlpha, setNavAlpha] = useState(0);
  const [navHeight, setNavHeight] = useState(0);
  const [tabsHeight, setTabsHeight] = useState(0);
  const [categoryOffset, setCategoryOffset] = useState(0);
  const [categorySticky, setCategorySticky] = useState(false);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const reviewsScrollRef = useRef<HTMLDivElement | null>(null);
  const detailsScrollRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const categoryBarRef = useRef<HTMLDivElement | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const categoryAnchorRef = useRef(0);
  const navRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const menuScrollRafRef = useRef(0);

  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [stockMessage, setStockMessage] = useState('');
  const stockMessageTimer = useRef<number | null>(null);

  useBodyScrollLock(Boolean(selectedItem));

  useEffect(() => {
    if (selectedItem) return;
    const container = listScrollRef.current;
    if (!container) return;
    const targetTop = lastScrollTopRef.current;
    requestAnimationFrame(() => {
      container.scrollTo({ top: targetTop, behavior: 'auto' });
    });
  }, [selectedItem]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOnline(window.navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stockMessageTimer.current) {
        window.clearTimeout(stockMessageTimer.current);
        stockMessageTimer.current = null;
      }
    };
  }, []);

  const vendorProducts = useMemo(
    () => products.filter((product) => product.vendorId === vendor.id),
    [products, vendor.id]
  );

  const soldOutProductIds = useMemo(
    () => getSoldOutProductIds(vendor.id, vendorProducts),
    [vendor.id, vendorProducts]
  );

  const isClosed = useMemo(
    () => isVendorClosed(vendor.businessHours, vendor.isOpen !== false),
    [vendor.businessHours, vendor.isOpen]
  );

  const coverImage = typeof vendor.imageUrl === 'string' ? vendor.imageUrl.trim() : '';
  const hasCoverImage = Boolean(coverImage);
  const shortLocation = vendor.locationShort || vendor.location || '未知位置';
  const qualificationImage = vendor.qualificationImage?.trim() || '';
  const signImage = vendor.signImage?.trim() || '';
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
    hasSign ? { key: 'sign', label: '招牌', image: signImage, uploadedAt: vendor.signUploadedAt } : null,
    hasQualification ? { key: 'qualification', label: '相关资质', image: qualificationImage, uploadedAt: vendor.qualificationUploadedAt } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; image: string; uploadedAt?: string }>;
  const hasDescription = Boolean(vendor.description && vendor.description.trim());

  const categoryList = useMemo(() => {
    const normalizedMenu = (vendor.menuCategories || [])
      .map((category) => category.trim())
      .filter(Boolean);
    if (normalizedMenu.length > 0) {
      return Array.from(new Set(normalizedMenu));
    }

    const fromProducts = Array.from(
      new Set(vendorProducts.map((item) => item.category).filter(Boolean))
    );
    if (fromProducts.length > 0) {
      return fromProducts;
    }

    return DEFAULT_MENU_CATEGORIES;
  }, [vendorProducts, vendor.menuCategories]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    categoryList.forEach((category) => map.set(category, []));

    vendorProducts.forEach((item) => {
      const targetCategory = item.category && categoryList.includes(item.category)
        ? item.category
        : categoryList[0];
      map.get(targetCategory)?.push(item);
    });

    return map;
  }, [vendorProducts, categoryList]);

  const updateNavAlpha = (scrollTop: number) => {
    const progress = (scrollTop - 120) / 120;
    setNavAlpha(Math.min(1, Math.max(0, progress)));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    const handleWindowScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || 0;
        updateNavAlpha(scrollTop);
        if (activeTab === 'menu' && categoryBarRef.current) {
          if (!categorySticky) {
            categoryAnchorRef.current = categoryBarRef.current.getBoundingClientRect().top + scrollTop;
          }
          const shouldStick = scrollTop + navHeight >= categoryAnchorRef.current;
          if (shouldStick !== categorySticky) {
            setCategorySticky(shouldStick);
          }
        }
        if (activeTab !== 'menu' || categoryList.length === 0) return;
        const currentTop = scrollTop + navHeight + categoryOffset + 12;
        let currentCategory = categoryList[0];
        categoryList.forEach((category) => {
          const node = sectionRefs.current[category];
          if (!node) return;
          const nodeTop = node.getBoundingClientRect().top + scrollTop;
          if (nodeTop <= currentTop) {
            currentCategory = category;
          }
        });
        if (currentCategory !== activeCategory) {
          setActiveCategory(currentCategory);
        }
      });
    };
    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [activeTab, categoryList, activeCategory, navHeight, categoryOffset, categorySticky]);

  useEffect(() => {
    const node = navRef.current;
    if (!node) {
      setNavHeight(0);
      return;
    }
    const updateHeight = () => setNavHeight(node.offsetHeight || 0);
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = tabsRef.current;
    if (!node) {
      setTabsHeight(0);
      return;
    }
    const updateHeight = () => setTabsHeight(node.offsetHeight || 0);
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = categoryBarRef.current;
    if (!node) {
      setCategoryOffset(0);
      return;
    }
    const updateOffset = () => setCategoryOffset(node.offsetHeight || 0);
    updateOffset();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateOffset);
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, categoryList.length]);

  useEffect(() => {
    if (categoryList.length === 0) return;
    if (!categoryList.includes(activeCategory)) {
      setActiveCategory(categoryList[0]);
    }
  }, [categoryList, activeCategory]);

  useEffect(() => {
    if (activeTab !== 'menu') return;
    const container = categoryScrollRef.current;
    const target = categoryButtonRefs.current[activeCategory];
    if (!container || !target) return;
    const targetLeft = target.offsetLeft;
    const targetRight = targetLeft + target.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;

    if (targetLeft >= viewLeft && targetRight <= viewRight) return;
    const nextLeft = Math.max(0, targetLeft - (container.clientWidth - target.offsetWidth) / 2);
    container.scrollTo({ left: nextLeft, behavior: 'smooth' });
  }, [activeCategory, activeTab, categoryList.length]);

  useEffect(() => {
      setGalleryIndex(0);
      if (selectedItem && selectedItem.options) {
          const defaults: Record<string, string[]> = {};
          selectedItem.options.forEach(opt => {
              const isRequired = opt.required !== false;
              if (isRequired && opt.choices[0]) {
                  defaults[opt.name] = [opt.choices[0].label];
              } else {
                  defaults[opt.name] = [];
              }
          });
          setSelectedSpecs(defaults);
      } else {
          setSelectedSpecs({});
      }
  }, [selectedItem]);

  useEffect(() => {
    let currentScrollTop = 0;
    if (activeTab === 'menu') {
      currentScrollTop = listScrollRef.current?.scrollTop ?? 0;
    } else if (activeTab === 'reviews') {
      currentScrollTop = reviewsScrollRef.current?.scrollTop ?? 0;
    } else if (activeTab === 'details') {
      currentScrollTop = detailsScrollRef.current?.scrollTop ?? 0;
    }
    updateNavAlpha(currentScrollTop);
  }, [activeTab, navHeight]);

  useEffect(() => {
    return () => {
      if (menuScrollRafRef.current) {
        cancelAnimationFrame(menuScrollRafRef.current);
      }
    };
  }, []);

  const galleryImages = useMemo(() => {
    if (!selectedItem) return [];
    const primary = selectedItem.imageUrl ? [selectedItem.imageUrl] : [];
    const urls = selectedItem.imageUrls && selectedItem.imageUrls.length > 0
      ? selectedItem.imageUrls
      : primary;
    const unique = Array.from(new Set(urls.filter(Boolean)));
    return unique.slice(0, 5);
  }, [selectedItem]);

  const totalCount = Object.values(cart).reduce((a, item) => a + item.count, 0);
  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (calculateItemPrice(item.product, item.specs) * item.count), 0);
  const selectedUnavailable = selectedItem ? (isClosed || soldOutProductIds.has(selectedItem.id)) : false;

  const currentVendorCount = Object.values(cart)
    .filter(item => item.product.vendorId === vendor.id)
    .reduce((sum, item) => sum + item.count, 0);
  const otherVendorCount = Math.max(totalCount - currentVendorCount, 0);
  
    const getProductCount = (itemId: string) => {
        return Object.values(cart)
          .filter(item => item.product.id === itemId)
          .reduce((sum, item) => sum + item.count, 0);
    };

    const getRemainingStock = (item: MenuItem, countInCart: number = 0) => {
        const stockLimit = item.stockLimit ?? 0;
        if (!stockLimit || stockLimit <= 0) return null;
        const dailySales = item.dailySales ?? 0;
        const available = Math.max(stockLimit - dailySales, 0);
        return Math.max(available - countInCart, 0);
    };

    const showStockToast = (message: string) => {
        setStockMessage(message);
        if (stockMessageTimer.current) {
            window.clearTimeout(stockMessageTimer.current);
        }
        stockMessageTimer.current = window.setTimeout(() => {
            setStockMessage('');
        }, 1800);
    };


  const getSpecSelections = (item: MenuItem | null, selections: Record<string, string[]>): SpecSelection[] => {
      if (!item || !item.options) return [];
      return Object.entries(selections).flatMap(([optionName, labels]) => {
          const option = item.options?.find((opt) => opt.name === optionName);
          return labels
            .map((label): SpecSelection | null => {
              const choice = option?.choices.find((optChoice) => optChoice.label === label);
              if (choice?.isSoldOut) return null;
              return { option: optionName, label, priceDelta: choice?.priceDelta };
            })
            .filter((value): value is SpecSelection => Boolean(value));
      });
  };

    const dynamicModalPrice = useMemo(() => {
        if (!selectedItem) return 0;
        const currentSpecList = getSpecSelections(selectedItem, selectedSpecs);
        return calculateItemPrice(selectedItem, currentSpecList);
    }, [selectedItem, selectedSpecs]);
    const selectedRemaining = selectedItem ? getRemainingStock(selectedItem, 0) : null;

  const handleSpecSelect = (
    optionName: string,
    choiceLabel: string,
    isRequired: boolean,
    maxSelection?: number,
    isSoldOut: boolean = false
  ) => {
      if (isSoldOut) return;
      setSelectedSpecs(prev => {
          const current = prev[optionName] || [];
          if (isRequired) {
              return { ...prev, [optionName]: [choiceLabel] };
          }
          const exists = current.includes(choiceLabel);
          if (exists) {
              return { ...prev, [optionName]: current.filter(item => item !== choiceLabel) };
          }
          if (maxSelection === 1) {
              return { ...prev, [optionName]: [choiceLabel] };
          }
          if (maxSelection && maxSelection > 0 && current.length >= maxSelection) {
              return prev;
          }
          return { ...prev, [optionName]: [...current, choiceLabel] };
      });
  };

    const handleAddToCartFromModal = () => {
        if (!selectedItem || isClosed || soldOutProductIds.has(selectedItem.id)) return;
        const available = getRemainingStock(selectedItem, 0);
        const remaining = getRemainingStock(selectedItem, getProductCount(selectedItem.id));
        if (remaining !== null && remaining <= 0) {
            const label = available !== null ? `库存不足，剩余${available}份` : '库存不足';
            showStockToast(`${selectedItem.name}${label}`);
            return;
        }
        const specsArray = getSpecSelections(selectedItem, selectedSpecs);
        onUpdateCart(selectedItem, 1, specsArray);
        setSelectedItem(null);
    };

  const handleGalleryScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      const nextIndex = Math.round(container.scrollLeft / container.clientWidth);
      setGalleryIndex(nextIndex);
  };

    const handleListAddClick = (e: React.MouseEvent, item: MenuItem) => {
        e.stopPropagation();
        if (isClosed || soldOutProductIds.has(item.id)) {
            return;
        }
        const available = getRemainingStock(item, 0);
        const remaining = getRemainingStock(item, getProductCount(item.id));
        if (remaining !== null && remaining <= 0) {
            const label = available !== null ? `库存不足，剩余${available}份` : '库存不足';
            showStockToast(`${item.name}${label}`);
            return;
        }
        if (item.options && item.options.length > 0) {
            if (listScrollRef.current) {
              lastScrollTopRef.current = listScrollRef.current.scrollTop;
            }
            setSelectedItem(item);
        } else {
            onUpdateCart(item, 1, []);
        }
    };

  const handleOpenItem = (item: MenuItem) => {
      if (listScrollRef.current) {
        lastScrollTopRef.current = listScrollRef.current.scrollTop;
      }
      setSelectedItem(item);
  };

  const handleMenuScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      updateNavAlpha(container.scrollTop);
      if (menuScrollRafRef.current) cancelAnimationFrame(menuScrollRafRef.current);
      menuScrollRafRef.current = requestAnimationFrame(() => {
        const currentTop = container.scrollTop + categoryOffset + navHeight + 12;
        let currentCategory = categoryList[0];
        categoryList.forEach((category) => {
          const node = sectionRefs.current[category];
          if (node && node.offsetTop <= currentTop) {
            currentCategory = category;
          }
        });
        if (currentCategory !== activeCategory) {
          setActiveCategory(currentCategory);
        }
      });
  };

  const handlePanelScroll = (event: React.UIEvent<HTMLDivElement>) => {
      updateNavAlpha(event.currentTarget.scrollTop);
  };

  const handleCategoryJump = (category: string) => {
      const container = listScrollRef.current;
      const target = sectionRefs.current[category];
      if (!target) return;
      const isScrollable = !!container && container.scrollHeight > container.clientHeight + 1;
      if (isScrollable && container) {
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const offset = targetTop - containerTop + container.scrollTop - categoryOffset - navHeight - 8;
        container.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' });
      } else {
        const targetTop = target.getBoundingClientRect().top + (window.scrollY || 0);
        const offset = targetTop - navHeight - categoryOffset - 8;
        window.scrollTo({ top: Math.max(offset, 0), behavior: 'smooth' });
      }
      setActiveCategory(category);
  };

  const headerBlock = (
    <div className="relative w-full shrink-0 z-10">
      <div className="relative h-48 sm:h-56 w-full group overflow-hidden">
        {hasCoverImage ? (
          <img
            src={coverImage}
            alt={vendor.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transform scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#d7ebe7] via-[#eaf4f2] to-[#f1f7f5]" />
        )}
        <div className="absolute inset-0 bg-[#2d4f48]/30 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d4f48]/90 via-transparent to-transparent"></div>
        {/* 气泡暂时移除 */}
        <div className="absolute -bottom-1 left-0 w-full text-[#f1f7f5]">
           <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-10 sm:h-12 md:h-16">
              <path fill="currentColor" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,234.7C672,256,768,288,864,282.7C960,277,1056,235,1152,208C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
           </svg>
        </div>
      </div>

      <div className="absolute bottom-4 sm:bottom-6 left-0 w-full px-4 sm:px-6 z-20 flex justify-between items-end">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heavy text-[#f1f7f5] mb-2 tracking-wide drop-shadow-md">{vendor.name}</h1>
          <div className="flex items-center gap-3 text-[#d0e8e2] text-xs font-medium tracking-wider">
             {SHOW_RATINGS && (
               <>
                 <div className="flex items-center gap-1 bg-[#e2f3a6] px-2 py-1 rounded-lg text-[#2d4f48] shadow-sm font-heavy"><Star size={12} className="fill-[#2d4f48]" /><span>{vendor.rating}</span></div>
                 <span className="w-1 h-1 rounded-full bg-white/50"></span>
               </>
             )}
             <div className="flex items-center gap-1 font-heavy"><MapPin size={14} /><span>{shortLocation}</span></div>
           </div>
        </div>
      </div>
    </div>
  );

  const tabsBlock = (
    <div
      ref={tabsRef}
      className="bg-[#f1f7f5]/95 backdrop-blur-md px-4 sm:px-6 pb-2 pt-0 flex gap-6 border-b border-[#193b35]/10"
    >
        <button onClick={() => setActiveTab('menu')} className={`pb-2 text-sm font-heavy transition-all relative ${activeTab === 'menu' ? 'text-[#193b35]' : 'text-[#193b35]/40'}`}>
           点餐
           {activeTab === 'menu' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#193b35] rounded-t-full"></div>}
        </button>
        {(appConfig?.enableClientReviews !== false) && (
          <button onClick={() => setActiveTab('reviews')} className={`pb-2 text-sm font-heavy transition-all relative ${activeTab === 'reviews' ? 'text-[#193b35]' : 'text-[#193b35]/40'}`}>
             评价
             <span className="ml-1 text-[10px] bg-[#cce8e4] text-[#193b35] px-1.5 rounded-full font-bold">856</span>
             {activeTab === 'reviews' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#193b35] rounded-t-full"></div>}
          </button>
        )}
        <button onClick={() => setActiveTab('details')} className={`pb-2 text-sm font-heavy transition-all relative ${activeTab === 'details' ? 'text-[#193b35]' : 'text-[#193b35]/40'}`}>
           详情
           {activeTab === 'details' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#193b35] rounded-t-full"></div>}
        </button>
    </div>
  );

  const navSolid = navAlpha > 0.2;

  return (
    <div className="min-h-screen bg-[#f1f7f5] relative flex flex-col font-sans overflow-x-hidden">
      <div ref={navRef} className="fixed top-0 left-0 right-0 z-30">
        <div
          className="px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300"
          style={{
            backgroundColor: `rgba(241, 247, 245, ${0.92 * navAlpha})`,
            borderBottom: `1px solid rgba(25, 59, 53, ${0.12 * navAlpha})`,
            boxShadow: navAlpha > 0.05 ? `0 8px 24px rgba(25, 59, 53, ${0.16 * navAlpha})` : 'none',
            backdropFilter: navAlpha > 0.02 ? `blur(${10 * navAlpha}px)` : 'none',
            WebkitBackdropFilter: navAlpha > 0.02 ? `blur(${10 * navAlpha}px)` : 'none'
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onBack}
              aria-label="返回"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                navSolid
                  ? 'bg-gray-100 border-gray-200 text-[#193b35]'
                  : 'bg-white/20 backdrop-blur-md border-white/20 text-white'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <div
              className="text-sm font-heavy text-[#193b35] truncate transition-[opacity,transform] duration-300"
              style={{ opacity: navSolid ? 1 : 0, transform: `translateY(${navSolid ? 0 : -6}px)` }}
            >
              {vendor.name}
            </div>
            <button 
              onClick={onToggleFavorite} 
              aria-label={isFavorite ? '取消收藏' : '加入收藏'}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                isFavorite 
                  ? 'bg-[#e2f3a6] border-[#e2f3a6] text-[#e87a5f]'
                  : navSolid
                    ? 'bg-gray-100 border-gray-200 text-[#193b35]'
                    : 'bg-white/20 backdrop-blur-md border-white/20 text-white'
              }`}
            >
              <Heart size={18} className={isFavorite ? 'fill-[#e87a5f]' : ''} />
            </button>
          </div>
        </div>
      </div>
      
      {/* SEAFOOD BACKGROUND DECORATION */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#193b35 1.5px, transparent 1.5px)', backgroundSize: '30px 30px' }}></div>
         <div className="absolute top-[12%] -left-6 text-[#2d4f48] opacity-[0.04] transform -rotate-12"><CrabIcon className="w-48 h-48" /></div>
         <div className="absolute top-[35%] -right-10 text-[#2d4f48] opacity-[0.04] transform rotate-45"><ShrimpIcon className="w-56 h-56" /></div>
         <div className="absolute bottom-[20%] left-4 text-[#2d4f48] opacity-[0.05] transform rotate-12"><StarfishIcon className="w-24 h-24" /></div>
         <ShellIcon className="absolute top-[50%] right-[30%] w-12 h-12 text-[#2d4f48] opacity-[0.04] transform -rotate-45" />
         <ShellIcon className="absolute bottom-[10%] left-[40%] w-16 h-16 text-[#2d4f48] opacity-[0.04] transform rotate-12" />
         <PalmLeafIcon className="absolute -bottom-10 -right-10 w-64 h-64 text-[#2d4f48] opacity-[0.03] transform -rotate-12" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 flex flex-col relative z-10">
        {activeTab === 'menu' && (
          <PullToRefresh
            containerRef={listScrollRef}
            onRefresh={onRefresh}
            className="flex-1 pb-[calc(env(safe-area-inset-bottom)+160px)]"
            onScroll={handleMenuScroll}
          >
            {headerBlock}
            {tabsBlock}
            {!isOnline && (
              <div className="mx-4 sm:mx-6 mt-3 mb-2 px-4 py-2 rounded-2xl bg-[#fff3cd] text-[#8a6d3b] text-xs font-bold shadow-sm border border-[#ffe8a1]">
                网络连接已断开，部分功能可能不可用
              </div>
            )}
            {isClosed && (
              <div className="mx-4 sm:mx-6 mt-3 mb-2 px-4 py-2 rounded-2xl bg-[#f1f7f5] text-[#193b35]/70 text-xs font-bold shadow-sm border border-[#193b35]/10">
                今日已打烊 · 营业时间 {vendor.businessHours || '未设置'}
              </div>
            )}
            {categorySticky && (
              <div aria-hidden="true" style={{ height: categoryOffset }} />
            )}
            <div
              ref={categoryBarRef}
              className={`${categorySticky ? 'fixed left-0 right-0 shadow-[0_6px_16px_rgba(25,59,53,0.08)]' : 'sticky'} z-20 bg-[#f1f7f5]/95 backdrop-blur-md pt-4 pb-4 px-0 border-b border-[#193b35]/10 overflow-visible`}
              style={{ top: navHeight }}
            >
              <div ref={categoryScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pr-4 pb-1">
                {categoryList.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button 
                      key={cat}
                      ref={(node) => { categoryButtonRefs.current[cat] = node; }}
                      onClick={() => handleCategoryJump(cat)}
                      className={`relative whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-heavy transition-all duration-300 border-2 ${
                        isActive 
                        ? 'bg-[#cce8e4] border-[#cce8e4] text-[#193b35] shadow-[4px_4px_0px_#193b35]' 
                        : 'bg-white border-white text-slate-500 hover:bg-[#f0fdf9]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="px-4 sm:px-5 pt-3 space-y-6">
              {vendorProducts.length === 0 ? (
                <StatePanel
                  variant="empty"
                  title="\u6682\u65e0\u5546\u54c1"
                  description="\u644a\u4e3b\u6b63\u5728\u51c6\u5907\u83dc\u5355"
                />
              ) : (
                categoryList.map((category) => {
                  const items = itemsByCategory.get(category) || [];
                  return (
                    <div key={category} className="space-y-5">
                      <div
                        ref={(node) => { sectionRefs.current[category] = node; }}
                        style={{ scrollMarginTop: `${categoryOffset + navHeight + 16}px` }}
                        className="flex items-center gap-3 mb-1 px-1"
                      >
                        <div className="p-1.5 bg-[#cce8e4] rounded-full text-[#193b35]">
                          <CoconutIcon className="w-4 h-4" />
                        </div>
                        <h3 className="font-heavy text-[#193b35] text-lg">{category}</h3>
                      </div>

                      {items.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-[#193b35]/10 bg-white/70 px-4 py-6 text-center text-xs font-bold text-[#193b35]/50">
                          暂无该分类商品
                        </div>
                      ) : items.map((item) => {
                        const countInCart = getProductCount(item.id);
                        const availableStock = getRemainingStock(item, 0);
                        const hasOptions = item.options && item.options.length > 0;
                        const isSoldOut = soldOutProductIds.has(item.id);
                        const isUnavailable = isClosed || isSoldOut;
                        const unavailableLabel = isClosed ? '已打烊' : '已售罄';

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleOpenItem(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleOpenItem(item);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`查看${item.name}`}
                            className={`cv-auto flex gap-4 p-3 bg-white/80 backdrop-blur-sm rounded-[24px] shadow-sm border border-white relative group overflow-hidden ${isUnavailable ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                          >
                              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#cce8e4]/30 to-transparent rounded-bl-[40px] pointer-events-none"></div>
                              <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 relative rounded-2xl overflow-hidden shadow-sm bg-[#e8f5e9]">
                                  <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                  {item.isHot && <div className="absolute top-2 left-2 bg-[#e2f3a6] text-[#193b35] text-[10px] font-heavy px-2 py-1 rounded-md shadow-sm">HOT</div>}
                                  {isUnavailable && (
                                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-heavy text-[#193b35]/70">
                                      {unavailableLabel}
                                    </div>
                                  )}
                              </div>

                              <div className="flex-1 flex flex-col justify-between py-1">
                                  <div>
                                      <h4 className="font-heavy text-[#193b35] text-[16px] leading-tight mb-1.5 flex items-center gap-1.5">
                                      {item.name}
                                      {item.isSpicy && <Flame size={14} className="text-[#e87a5f] fill-[#e87a5f]" />}
                                      </h4>
                                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">{item.description}</p>
                                  </div>

                                  <div className="flex items-end justify-between mt-2">
                                    <div className="flex items-baseline gap-2 text-[#193b35]">
                                        <span className="text-xs font-heavy">{'\u00a5'}</span>
                                        <span className="text-xl font-heavy">{item.price}</span>
                                        {availableStock !== null && (
                                          <span className="text-[10px] font-bold text-[#2d4f48]/60 bg-[#f1f7f5] px-2 py-0.5 rounded-full">
                                            {`剩余${availableStock}份`}
                                          </span>
                                        )}
                                    </div>

                                      <div onClick={isUnavailable ? undefined : (e => e.stopPropagation())}> 
                                          {isUnavailable ? (
                                              <div className="px-3 py-1.5 rounded-full text-xs font-heavy bg-[#f1f7f5] text-[#193b35]/50 border border-[#dcece9]">
                                                  {unavailableLabel}
                                              </div>
                                          ) : hasOptions ? (
                                              <div className="relative">
                                                  <button 
                                                      onClick={(e) => handleListAddClick(e, item)}
                                                      aria-label={`选择${item.name}规格`}
                                                      className="bg-[#193b35] text-[#e2f3a6] px-3 py-1.5 rounded-full text-xs font-heavy shadow-sm active:scale-95 transition-transform"
                                                  >
                                                      {'\u9009\u89c4\u683c'}
                                                  </button>
                                                  {countInCart > 0 && (
                                                      <div className="absolute -top-2 -right-2 bg-[#ff8a65] text-white text-[10px] font-heavy w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                                          {countInCart}
                                                      </div>
                                                  )}
                                              </div>
                                          ) : (
                                              <div className="flex items-center bg-[#f0f7f5] rounded-full p-1 border border-[#dcece9]">
                                                  {countInCart > 0 && (
                                                      <>
                                                      <button onClick={() => onUpdateCart(item, -1)} aria-label={`减少${item.name}`} className="w-7 h-7 rounded-full flex items-center justify-center text-[#193b35] hover:bg-[#d0e8e2] transition-colors"><Minus size={16} strokeWidth={3} /></button>
                                                      <span className="text-sm font-heavy text-[#193b35] w-6 text-center">{countInCart}</span>
                                                      </>
                                                  )}
                                                  <button onClick={(e) => handleListAddClick(e, item)} aria-label={`添加${item.name}`} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${countInCart > 0 ? 'bg-[#cce8e4] text-[#193b35]' : 'bg-[#193b35] text-[#e2f3a6] rotate-90 hover:rotate-0'}`}>
                                                      <Plus size={16} strokeWidth={3} />
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </PullToRefresh>
        )}

        {activeTab === 'reviews' && (appConfig?.enableClientReviews !== false) && (
            <div ref={reviewsScrollRef} onScroll={handlePanelScroll} className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+160px)]">
             {headerBlock}
             {tabsBlock}
             <div className="px-4 sm:px-5 pt-4">
             <div className="relative bg-white/90 backdrop-blur-sm rounded-[24px] p-5 mb-6 shadow-sm border border-white overflow-hidden group">
                <div className="absolute -right-6 -top-6 opacity-5 text-[#193b35]">
                    <SunIcon className="w-32 h-32 animate-[spin_60s_linear_infinite]" />
                </div>
                <div className="absolute -left-4 -bottom-4 opacity-5 text-[#193b35] transform rotate-12">
                    <CoconutTreeIcon className="w-24 h-24" />
                </div>
                
                <div className="relative z-10 flex items-center justify-between">
                    {SHOW_RATINGS && (
                      <div className="flex flex-col items-center pr-6 border-r border-dashed border-[#193b35]/10">
                         <span className="text-4xl font-heavy text-[#193b35] leading-none">{vendor.rating}</span>
                         <div className="flex gap-0.5 mt-1">
                            {[...Array(5)].map((_,i) => <Star key={i} size={10} className="fill-[#193b35] text-[#193b35]"/>)}
                         </div>
                         <span className="text-[10px] text-[#2d4f48]/60 font-bold mt-1 bg-[#f0f7f5] px-2 py-0.5 rounded-full">综合评分</span>
                      </div>
                    )}
                    <div className={`flex-1 ${SHOW_RATINGS ? 'pl-6' : ''} flex flex-col gap-3`}>
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-[#193b35] font-bold">口味</span>
                          <div className="flex-1 h-2 bg-[#f0f7f5] rounded-full mx-3 overflow-hidden">
                             <div className="h-full bg-[#193b35] rounded-full w-[98%]"></div>
                          </div>
                          <span className="font-heavy text-[#193b35]">4.9</span>
                       </div>
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-[#193b35] font-bold">包装</span>
                          <div className="flex-1 h-2 bg-[#f0f7f5] rounded-full mx-3 overflow-hidden">
                             <div className="h-full bg-[#193b35] rounded-full w-[96%]"></div>
                          </div>
                          <span className="font-heavy text-[#193b35]">4.8</span>
                       </div>
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-[#193b35] font-bold">出餐</span>
                          <div className="flex-1 h-2 bg-[#f0f7f5] rounded-full mx-3 overflow-hidden">
                             <div className="h-full bg-[#193b35] rounded-full w-[98%]"></div>
                          </div>
                          <span className="font-heavy text-[#193b35]">4.9</span>
                       </div>
                    </div>
                </div>
             </div>

             <div className="flex flex-wrap gap-2 mb-6 relative z-10">
                {REVIEW_TAGS.map((tag, i) => {
                   const isActive = activeReviewTag === tag.label;
                   return (
                     <button 
                       key={i} 
                       onClick={() => setActiveReviewTag(tag.label)}
                       className={`px-3 py-1.5 rounded-xl text-xs font-heavy border transition-all active:scale-95 ${
                           isActive 
                           ? 'bg-[#193b35] text-[#e2f3a6] border-[#193b35] shadow-[2px_2px_0px_#cce8e4]' 
                           : 'bg-white/80 backdrop-blur-sm text-[#193b35] border-transparent shadow-sm hover:bg-white'
                       }`}
                     >
                        {tag.label} {tag.count}
                     </button>
                   );
                })}
             </div>

             <div className="space-y-4 relative z-10">
                {MOCK_REVIEWS.map(review => (
                   <div key={review.id} className="cv-auto bg-white/90 backdrop-blur-sm rounded-[24px] p-4 shadow-sm border border-white">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2">
                            <img src={review.userAvatar} className="w-9 h-9 rounded-full object-cover bg-gray-100 border border-white shadow-sm" loading="lazy" decoding="async" alt={review.userName} />
                            <div>
                               <div className="text-xs font-heavy text-[#193b35]">{review.userName}</div>
                               <div className="text-[10px] text-gray-400 font-medium mt-0.5">{review.date}</div>
                            </div>
                         </div>
                         {SHOW_RATINGS && (
                           <div className="bg-[#f0f7f5] px-2 py-1 rounded-lg flex items-center gap-1">
                               <Star size={10} className="fill-[#fbbf24] text-[#fbbf24]" />
                               <span className="text-[10px] font-heavy text-[#193b35]">{review.rating}</span>
                           </div>
                         )}
                      </div>
                      <div className="text-sm text-[#2d4f48] leading-relaxed mb-3 font-medium">
                         {review.content}
                      </div>
                   </div>
                ))}
             </div>
             
             <div className="text-center py-8 opacity-40">
                <p className="text-xs font-bold text-[#193b35]">到底啦 ~</p>
             </div>
             </div>
          </div>
        )}

        {/* DETAILS TAB CONTENT */}
        {activeTab === 'details' && (
          <div ref={detailsScrollRef} onScroll={handlePanelScroll} className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+160px)]">
              {headerBlock}
              {tabsBlock}
              <div className="px-4 sm:px-5 pt-4 space-y-6">
              
              {/* SECTION: BASIC INFO */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#193b35]/5 space-y-5">
                  <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><MapPin size={18} /></div>
                      <div className="flex-1">
                          <h3 className="text-sm font-heavy text-[#193b35] mb-1">地理位置</h3>
                          <p className="text-xs text-gray-500 leading-relaxed font-medium">{vendor.location || vendor.locationShort || '暂无信息'}</p>
                          <button className="mt-3 text-[11px] font-heavy text-[#193b35] flex items-center gap-1 bg-[#e2f3a6]/30 px-3 py-1.5 rounded-full hover:bg-[#e2f3a6]/50 transition-colors">
                              <ExternalLink size={12} /> 查看地图指引
                          </button>
                      </div>
                  </div>

                  {(appConfig?.showBusinessHours !== false) && (
                    <div className="flex items-start gap-4 border-t border-dashed border-gray-100 pt-5">
                        <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><Clock size={18} /></div>
                        <div className="flex-1">
                            <h3 className="text-sm font-heavy text-[#193b35] mb-1">营业时间</h3>
                            <p className="text-xs text-gray-500 font-medium">{vendor.businessHours || '暂无信息'}</p>
                        </div>
                    </div>
                  )}

                  {(appConfig?.showContactPhone !== false) && (
                    <div className="flex items-start gap-4 border-t border-dashed border-gray-100 pt-5">
                        <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><Phone size={18} /></div>
                        <div className="flex-1">
                            <h3 className="text-sm font-heavy text-[#193b35] mb-1">摊主电话</h3>
                            <p className="text-xs text-gray-500 font-medium">{vendor.phone || '暂无信息'}</p>
                        </div>
                    </div>
                  )}
              </div>

              {/* SECTION: DESCRIPTION / STORY */}
              {(appConfig?.showMerchantSlogan !== false) && hasDescription && (
                <div className="relative bg-white rounded-[24px] p-6 shadow-sm border border-[#193b35]/5 overflow-hidden">
                    <PalmLeafIcon className="absolute -right-8 -top-8 w-32 h-32 text-[#193b35]/5 transform rotate-45" />
                    <h3 className="text-base font-heavy text-[#193b35] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#e2f3a6] rounded-full"></div>
                        摊主寄语
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium indent-6">
                        {vendor.description}
                    </p>

                </div>
              )}

              {/* SECTION: QUALIFICATIONS */}
              {(appConfig?.showQualifications !== false) && archiveItems.length > 0 && (
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#193b35]/5">
                    <h3 className="text-base font-heavy text-[#193b35] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#e2f3a6] rounded-full"></div>
                        {archiveTitle}
                    </h3>
                    <div className={`grid ${archiveItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                      {archiveItems.map((item) => {
                        const uploadTime = formatUploadTime(item.uploadedAt);
                        return (
                          <div key={item.key} className="group relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-inner">
                              <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={item.label} loading="lazy" decoding="async" />
                              <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                                  <ShieldCheck size={32} className="text-[#193b35]/20" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-2 text-center text-[9px] font-black text-[#193b35] uppercase tracking-tighter space-y-1">
                                 <div>{item.label}</div>
                                 {uploadTime && (
                                   <div className="text-[9px] font-medium text-[#193b35]/60">上传 {uploadTime}</div>
                                 )}
                              </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              )}

              <div className="text-center py-10 opacity-10">
                  <CoconutTreeIcon className="w-24 h-24 mx-auto" />
                  <div className="text-[10px] font-black tracking-[0.4em] uppercase text-[#193b35] mt-4">TanTan Certified</div>
              </div>
              </div>
          </div>
        )}
      </div>

      {/* GLOBAL CART BAR */}
      {totalCount > 0 && activeTab !== 'details' && (
         <div
           className={`fixed left-4 right-4 sm:left-6 sm:right-6 z-40 animate-[slideUp_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)] ${selectedItem ? 'pointer-events-none' : ''}`}
           style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
         >
            <div className="bg-[#193b35] rounded-[28px] h-18 p-2 pr-2.5 flex items-center justify-between shadow-[0_8px_30px_rgba(25,59,53,0.35)] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#2d5c52] rounded-full blur-2xl opacity-50 pointer-events-none -mr-10 -mt-10"></div>

               <div
                 className="flex items-center gap-4 pl-2 relative z-10"
                 onClick={onOpenCart}
                 onKeyDown={(event) => {
                   if (event.key === 'Enter' || event.key === ' ') {
                     event.preventDefault();
                     onOpenCart();
                   }
                 }}
                 role="button"
                 tabIndex={0}
                 aria-label="打开购物车"
               >
                  <div className="w-12 h-12 rounded-full bg-[#e2f3a6] flex items-center justify-center text-[#193b35] shadow-inner relative group cursor-pointer">
                     <ShoppingBag size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                     <div className="absolute -top-1 -right-1 bg-[#ff8a65] text-white text-[10px] font-heavy w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#193b35]">
                        {totalCount}
                     </div>
                  </div>

                  <div className="flex flex-col cursor-pointer">
                     <div className="text-white font-heavy text-lg leading-none flex items-baseline">
                        <span className="text-sm opacity-80 mr-1 font-heavy">￥</span>{totalPrice}
                     </div>
                     {otherVendorCount > 0 && (
                       <div className="mt-1 flex items-center text-[10px] font-black text-[#cce8e4]/80">
                         他摊{otherVendorCount}件
                       </div>
                     )}
                  </div>
               </div>

               <button onClick={onOpenCart} className="h-12 px-6 bg-[#cce8e4] hover:bg-white text-[#193b35] text-sm font-heavy rounded-[20px] transition-colors relative z-10 shadow-sm flex items-center gap-2">
                  <span>去结算</span>
               </button>
            </div>
         </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={() => setSelectedItem(null)}></div>
          <div className="bg-[#fdfcf8] w-full h-[85%] sm:h-auto sm:max-h-[80%] rounded-t-[32px] sm:rounded-[32px] sm:m-6 shadow-2xl relative pointer-events-auto flex flex-col animate-[slideUpLarge_0.3s_ease-out]">
            <div className="h-[260px] sm:h-[288px] w-full relative shrink-0">
               <div className="w-full h-full overflow-x-auto no-scrollbar flex snap-x snap-mandatory scroll-smooth" onScroll={handleGalleryScroll}>
                  {galleryImages.map((src, index) => (
                    <div key={`${src}-${index}`} className="w-full h-full flex-shrink-0 snap-center">
                      <img src={src} alt={selectedItem.name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-t-[32px]" />
                    </div>
                  ))}
               </div>
               <button onClick={() => setSelectedItem(null)} aria-label="关闭" className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"><X size={20} strokeWidth={3} /></button>
               {galleryImages.length > 1 && (
                 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                   {galleryImages.map((_, index) => (
                     <span key={`dot-${index}`} className={`h-1.5 w-1.5 rounded-full ${index === galleryIndex ? 'bg-white' : 'bg-white/40'}`}></span>
                   ))}
                 </div>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-24">
               <h2 className="text-2xl font-heavy text-[#193b35] mb-2">{selectedItem.name}</h2>
               <p className="text-sm text-[#2d4f48]/80 leading-relaxed mb-6 font-medium">{selectedItem.description}</p>
               
               {selectedItem.options && selectedItem.options.length > 0 && (
                   <div className="space-y-5 border-t border-dashed border-gray-200 pt-4">
                      {selectedItem.options.map((option) => {
                        const isRequired = option.required !== false;
                        const maxSelection = typeof option.maxSelection === 'number' ? option.maxSelection : 0;
                        return (
                          <div key={option.name}>
                            <div className="flex items-center gap-2 mb-3">
                               <h3 className="text-base font-heavy text-[#193b35]">{option.name}</h3>
                               {isRequired ? (
                                  <span className="text-[10px] font-heavy text-[#e87a5f] bg-[#e87a5f]/10 px-2 py-0.5 rounded-full">{'\u5fc5\u9009'}</span>
                               ) : (
                                  <>
                                    <span className="text-[10px] font-heavy text-[#193b35]/60 bg-[#f1f7f5] px-2 py-0.5 rounded-full">{'\u53ef\u591a\u9009'}</span>
                                    {maxSelection > 0 && (
                                      <span className="text-[10px] font-heavy text-[#193b35]/60 bg-[#f1f7f5] px-2 py-0.5 rounded-full">{`最多可选${maxSelection}`}</span>
                                    )}
                                  </>
                               )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                               {option.choices.map((choice) => {
                                 const isChoiceSoldOut = choice.isSoldOut === true;
                                 const isSelected = (selectedSpecs[option.name] || []).includes(choice.label);
                                 return (
                                   <button 
                                       key={choice.label}
                                       onClick={() => handleSpecSelect(option.name, choice.label, isRequired, maxSelection, isChoiceSoldOut)}
                                       disabled={isChoiceSoldOut}
                                       className={`px-5 py-2.5 rounded-2xl text-sm font-heavy border shadow-sm transition-all ${
                                           isChoiceSoldOut
                                             ? 'bg-[#f1f7f5] text-[#193b35]/40 border-[#193b35]/10 cursor-not-allowed'
                                             : isSelected
                                               ? 'bg-[#cce8e4] text-[#193b35] border-[#193b35]/10 ring-1 ring-[#193b35]/5'
                                               : 'bg-white border-gray-200 text-gray-500'
                                       }`}
                                   >
                                        {choice.label} {choice.priceDelta ? `(+￥${choice.priceDelta})` : ''} {isChoiceSoldOut ? '已售罄' : ''}
                                   </button>
                                 );
                               })}
                            </div>
                          </div>
                        );
                      })}
                   </div>
               )}
            </div>

            <div className="p-6 pt-4 border-t border-gray-100 bg-white rounded-b-[32px]">
               <div className="flex items-center justify-between gap-4">
               <div className="flex items-baseline gap-2 text-[#193b35]">
                  <span className="text-sm font-heavy">￥</span>
                  <span className="text-3xl font-heavy">{dynamicModalPrice}</span>
                  {selectedRemaining !== null && (
                    <span className="text-[10px] font-bold text-[#2d4f48]/60 bg-[#f1f7f5] px-2 py-1 rounded-full">
                      {`剩余${selectedRemaining}份`}
                    </span>
                  )}
               </div>
                  
                  <button 
                    onClick={handleAddToCartFromModal}
                    disabled={selectedUnavailable}
                    className={`flex-1 h-14 rounded-2xl font-heavy text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${selectedUnavailable ? 'bg-[#f1f7f5] text-[#193b35]/40 cursor-not-allowed shadow-none border border-[#dcece9]' : 'bg-[#193b35] text-[#e2f3a6] shadow-[#193b35]/20 active:scale-95'}`}
                  >
                    {selectedUnavailable ? (
                      <span>{isClosed ? '已打烊' : '已售罄'}</span>
                    ) : (
                      <>
                        <Plus size={22} strokeWidth={3} /> 加入购物车
                      </>
                    )}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
      {stockMessage && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+120px)] z-[120] bg-[#193b35] text-[#e2f3a6] text-xs font-heavy px-4 py-2 rounded-full shadow-lg">
          {stockMessage}
        </div>
      )}
      <style>{`
         @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
         }
         @keyframes slideUpLarge {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
         }
      `}</style>
    </div>
  );
};








