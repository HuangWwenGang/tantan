// 管理员端类型定义（与B端共享部分类型）

// 商户状态
export type VendorStatus = 'active' | 'banned' | 'pending';

// 商户信息（简化版，包含运营数据）
export interface Vendor {
  id: string;
  code: string;           // 登录码
  password?: string;      // 初始密码（仅创建时需要）
  name: string;
  category: string;
  status: VendorStatus;
  isOpen: boolean;
  rating: number;
  imageUrl: string;
  location: string;
  locationShort?: string;
  phone?: string;
  ownerName?: string;
  revenue?: number;       // 总营收
  qualificationImage?: string;
  qualificationUploadedAt?: string;
  signImage?: string;
  signUploadedAt?: string;
  createdAt?: string;     // 创建时间
  businessHours?: string; // 营业时间
}

// 应用配置（功能开关）
export interface AppConfig {
  // B端商家后台功能开关
  enableStats: boolean;
  enableProducts: boolean;
  enableOrders: boolean;
  enableSettings: boolean;
  systemMaintenance: boolean;

  // C端小程序前台显示开关
  enableClientReviews: boolean;      // 评论区
  showBusinessHours: boolean;        // 营业时间
  showQualifications: boolean;       // 商家资质/相册
  showContactPhone: boolean;         // 联系电话
  showMerchantSlogan: boolean;       // 商家寄语
  clientBaseUrl?: string;            // C端基础地址
  helpCenterTitle: string;
  helpCenterHours: string;
  helpCenterContactLabel: string;
  helpCenterContactValue: string;
  helpCenterFaqs: HelpCenterFaq[];
}

export interface HelpCenterFaq {
  question: string;
  answer: string;
}

export interface OrderItem {
  name: string;
  count: number;
  price: number;
  specs?: string[];
  imageUrl?: string;
}

export interface PaymentProof {
  url: string;
  uploadedAt: string;
}

export interface Order {
  id: string;
  vendorId: string;
  vendorName: string;
  status: 'pending-payment' | 'pending-confirmation' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  orderType: 'delivery' | 'dine-in';
  itemsSummary: string;
  items: OrderItem[];
  totalPrice: number;
  finalTotal?: number;
  date: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  paidAt?: string;
  completedAt?: string;
  paymentStatus?: string;
  cancelReason?: string;
  paymentMethod?: string;
  buyerPhone?: string;
  paymentProofs?: PaymentProof[];
}

// 平台统计数据
export interface PlatformStats {
  totalVendors: number;              // 总商户数
  activeVendors: number;             // 活跃商户数
  openVendors: number;               // 正在营业商户数
  pendingVendors: number;            // 待审核商户数
  bannedVendors: number;             // 已封禁商户数
  totalRevenue: number;              // 总营收
  totalOrders: number;               // 总订单数
  avgOrderValue: number;             // 平均客单价
  todayRevenue: number;              // 今日营收
  todayOrders: number;               // 今日订单数
}

// 创建商户请求
export interface CreateVendorRequest {
  code: string;                      // 登录码（唯一）
  password: string;                  // 初始密码
  name: string;                      // 商户名称
  category: string;                  // 分类
  location: string;                  // 地址
  ownerName?: string;                // 摊主姓名
  phone?: string;                    // 联系电话
  imageUrl?: string;                 // 封面图
}
