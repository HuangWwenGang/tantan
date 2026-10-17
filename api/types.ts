
export interface ProductOption {
  name: string; // e.g., "甜度", "规格"
  choices: { label: string; priceDelta?: number; isSoldOut?: boolean }[];
  required?: boolean;
  multi?: boolean;
  maxSelection?: number;
}

export interface SpecSelection {
  option: string;
  label: string;
  priceDelta?: number;
}

export type SpecLike = SpecSelection | string;

export interface Vendor {
  id: string;
  code: string;
  password?: string;
  name: string;
  category: string;
  status?: 'active' | 'banned' | 'pending';
  isOpen?: boolean;
  rating: number;
  imageUrl: string;
  location: string;
  locationShort?: string;
  lastVisited?: string;
  menuCategories?: string[];
  // NEW: Detailed Information
  description?: string;
  businessHours?: string;
  phone?: string;
  paymentWechatQr?: string;
  paymentAlipayQr?: string;
  qualifications?: string[]; // URLs or placeholders for licenses
  qualificationImage?: string;
  qualificationUploadedAt?: string;
  signImage?: string;
  signUploadedAt?: string;
  ownerName?: string;
  revenue?: number;
  createdAt?: string;
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
  status?: 'available' | 'soldout';
  stockLimit?: number;
  dailySales?: number;
}

export interface OrderItem {
  productId?: string;
  name: string;
  count: number;
  price: number;
  subtotal?: number;
  specs?: SpecLike[];
  imageUrl?: string; // 新增：商品图�?  note?: string;
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
  statusHistory?: { status: Order['status']; at: string; note?: string }[];
  pickupCode?: string;
  tableNo?: string;
  boothCode?: string;
  pickupWindow?: string;
  itemsSummary: string;
  detailedItems?: OrderItem[];
  subtotal?: number;
  packagingFee?: number;
  serviceFee?: number;
  deliveryFee?: number;
  discount?: number;
  couponId?: string;
  totalPrice: number;
  finalTotal?: number;
  date: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  paidAt?: string;
  completedAt?: string;
  count: number;
  riderName?: string;
  riderPhone?: string;
  deliveryTime?: string;
  remarks?: string;
  cancelReason?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded' | 'partially_refunded';
  paymentMethod?: string;
  transactionId?: string;
  address?: Address;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  paymentProofs?: PaymentProof[];
  refundStatus?: 'none' | 'pending' | 'refunded';
  refundAmount?: number;
  refundAt?: string;
}

export interface CartItem {
  product: MenuItem;
  count: number;
  specs: SpecSelection[];
}

export type CartState = Record<string, CartItem>;

export interface AppState {
  vendorCode: string;
  recentVendors: Vendor[];
}

// 应用配置（功能开关）
export interface AppConfig {
  // B端商家后台功能开关
  enableStats?: boolean;
  enableProducts?: boolean;
  enableOrders?: boolean;
  enableSettings?: boolean;
  systemMaintenance?: boolean;

  // C端小程序前台显示开关
  enableClientReviews?: boolean;      // 评论区
  showBusinessHours?: boolean;        // 营业时间
  showQualifications?: boolean;       // 商家资质/相册
  showContactPhone?: boolean;         // 联系电话
  showMerchantSlogan?: boolean;       // 商家寄语
  clientBaseUrl?: string;             // C端基础地址
  helpCenterTitle?: string;           // ?????????????????????
  helpCenterHours?: string;           // ????????????
  helpCenterContactLabel?: string;    // ??????????????????
  helpCenterContactValue?: string;    // 客服微信号/联系方式
  helpCenterFaqs?: HelpCenterFaq[];   // 常见问题（问答卡片）
}

export interface HelpCenterFaq {
  question: string;
  answer: string;
}

