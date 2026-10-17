
export interface ProductOption {
  name: string; // e.g., "甜度", "规格"
  choices: { label: string; priceDelta?: number; isSoldOut?: boolean }[];
  required?: boolean; // true = 单选(Radio), false = 多选(Checkbox)
  maxSelection?: number; // 仅当 required=false 时有效，限制最多选择几项，0或undefined表示不限
}

export interface Merchant {
  id: string;
  code: string; // 登录码
  password?: string;
  name: string;
  category: string;
  status: 'active' | 'banned' | 'pending'; // 账号状态
  isOpen: boolean; // 营业状态
  rating: number;
  imageUrl: string;
  location: string;
  locationShort?: string;
  lastVisited?: string;
  menuCategories?: string[];
  description?: string;
  businessHours?: string;
  phone?: string;
  paymentWechatQr?: string;
  paymentAlipayQr?: string;
  qualifications?: string[];
  qualificationImage?: string;
  qualificationUploadedAt?: string;
  signImage?: string;
  signUploadedAt?: string;
  ownerName?: string;
  revenue?: number; // 模拟总营收
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  isSpicy?: boolean;
  isHot?: boolean;
  options?: ProductOption[];
  status?: 'available' | 'soldout'; // Added for management
  stockLimit?: number; // 0 or undefined means unlimited
  dailySales?: number;
}

export interface OrderItem {
  name: string;
  count: number;
  price: number;
  specs?: string[];
  imageUrl?: string;
}

export interface Address {
  location: string;
  detail: string;
  contactName: string;
  contactPhone: string;
}

export interface PaymentProof {
  url: string;
  uploadedAt: string;
}

export interface Order {
  id: string;
  orderNo?: string;
  vendorId: string;
  vendorName: string;
  vendorImage: string;
  vendorLocation?: string;
  status: 'pending-payment' | 'pending-confirmation' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  orderType: 'delivery' | 'dine-in';
  pickupCode?: string;
  itemsSummary: string;
  items: OrderItem[];
  subtotal?: number;
  packagingFee?: number;
  serviceFee?: number;
  deliveryFee?: number;
  discount?: number;
  totalPrice: number;
  finalTotal?: number;
  date: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  paidAt?: string;
  completedAt?: string;
  count: number;
  cancelReason?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryTime?: string;
  remarks?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded' | 'partially_refunded';
  paymentMethod?: string;
  transactionId?: string;
  buyerPhone?: string;
  address?: Address;
  paymentProofs?: PaymentProof[];
  statusMessage?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: MenuItem;
  count: number;
  specs: string[];
}

export type CartState = Record<string, CartItem>;

export interface AppState {
  vendorCode: string;
  recentVendors: Merchant[];
}

// 新增：应用功能配置（权限控制）
export interface AppConfig {
  // B端商家后台功能开关
  enableStats: boolean;
  enableProducts: boolean;
  enableOrders: boolean;
  enableSettings: boolean;
  systemMaintenance: boolean; // 系统维护模式
  
  // C端小程序前台显示开关 (店铺装修/模块控制)
  enableClientReviews: boolean;   // 评论区
  showBusinessHours: boolean;     // 营业时间
  showQualifications: boolean;    // 商家资质/相册
  showContactPhone: boolean;      // 联系电话
  showMerchantSlogan: boolean;    // 商家寄语
  clientBaseUrl?: string;         // C端基础地址
  helpCenterTitle?: string;
  helpCenterHours?: string;
  helpCenterContactLabel?: string;
  helpCenterContactValue?: string;
  helpCenterFaqs?: HelpCenterFaq[];
}

export interface HelpCenterFaq {
  question: string;
  answer: string;
}
