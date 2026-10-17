// Fictional demonstration fixtures only; not real merchants, users or transactions.

import { Vendor, MenuItem, Order, Address, SpecLike } from './types';
import { normalizeSpecs } from './utils/specs';

export const calculateItemPrice = (product: MenuItem, specs: SpecLike[] = []): number => {
  let total = product.price;
  if (!product.options) return total;
  
  const normalized = normalizeSpecs(specs);

  product.options.forEach(option => {
    option.choices.forEach(choice => {
      const matched = normalized.some(
        (spec) => spec.label === choice.label && (spec.option === option.name || spec.option === 'spec')
      );
      if (matched && choice.priceDelta) {
        total += choice.priceDelta;
      }
    });
  });
  return total;
};

type VendorSeed = Vendor & { password?: string };

export const VENDORS: VendorSeed[] = [
  {
    id: 'v1',
    code: 'HI888',
    password: 'demo-merchant-123',
    name: '阿婆椰子鸡',
    category: '海岛烧烤',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=200&h=200',
    location: '后海村主街 108号 (近大榕树)',
    lastVisited: '昨天',
    description: '阿婆在后海摆摊三十年，坚持选用文昌散养走地鸡，每一颗椰子都是清晨现砍。这是大海的味道，也是时间的味道。',
    businessHours: '10:00 - 22:30',
    phone: '000 0000 0000',
    qualifications: [
      'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&q=80&w=300&h=400',
      'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&q=80&w=300&h=400'
    ]
  },
  {
    id: 'v2',
    code: 'COOL99',
    password: 'demo-merchant-123',
    name: '后海村冲浪果汁',
    category: '饮品',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=200&h=200',
    location: '沙滩 3号救生塔旁 黄色餐车',
    lastVisited: '3天前',
    description: '如果你冲浪累了，一定要来一杯阿强家的暴打柠檬。我们只用香水柠檬，纯手工捶打，给你的味蕾来一次海浪般的冲击。',
    businessHours: '09:00 - 20:00',
    phone: '000 0000 0000',
    qualifications: [
      'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&q=80&w=300&h=400'
    ]
  },
  {
    id: 'v3',
    code: 'SEA666',
    password: 'demo-merchant-123',
    name: '海风大排档',
    category: '海鲜',
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    location: '后海夜市 A区-05摊位',
    lastVisited: '1周前',
    description: '当日渔船捕捞，新鲜看得见。我们承诺不缺斤短两，只做回头客。夜市里的那抹烟火气，我们帮你守候。',
    businessHours: '17:30 - 02:00',
    phone: '000 0000 0000',
    qualifications: [
      'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&q=80&w=300&h=400',
      'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?auto=format&fit=crop&q=80&w=300&h=400'
    ]
  }
];

export const ALL_PRODUCTS: MenuItem[] = [
  {
    id: 'm1', vendorId: 'v1',
    name: '招牌原味椰子鸡',
    description: '选用文昌走地鸡，三个老椰子现砍熬汤，鲜甜嫩滑。',
    price: 128,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600&h=600',
    category: '招牌必吃',
    isHot: true,
    options: [
        { name: '份量', choices: [{label: '半只'}, {label: '整只', priceDelta: 60}], required: true },
        { name: '主食', choices: [{label: '无需主食'}, {label: '配椰子饭', priceDelta: 28}], required: false }
    ]
  },
  {
    id: 'm2', vendorId: 'v1',
    name: '炭烤生蚝 (半打)',
    description: '每日新鲜到货，个大肥美。铺上满满的蒜蓉和粉丝。',
    price: 58,
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=600&h=600',
    category: '海岛烧烤',
    isSpicy: true,
    options: [
        { name: '口味', choices: [{label: '蒜蓉粉丝'}, {label: '原味现烤'}, {label: '泰式酸辣'}], required: true }
    ]
  },
  {
    id: 'm3', vendorId: 'v1',
    name: '海南清补凉',
    description: '海南经典甜品，椰奶冰沙底，配料丰富。',
    price: 15,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=600&h=600',
    category: '清凉解暑',
    isHot: true,
    options: [
        { name: '底料', choices: [{label: '传统椰奶'}, {label: '椰奶冰沙'}, {label: '炒冰', priceDelta: 2}], required: true },
        { name: '加料', choices: [{label: '珍珠'}, {label: '芋圆'}], required: false }
    ]
  },
  {
    id: 'm6', vendorId: 'v2',
    name: '满杯西瓜桶',
    description: '整颗西瓜现榨，从早喝到晚，解暑神器。',
    price: 28,
    imageUrl: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&q=80&w=600&h=600',
    category: '鲜榨果汁',
    options: [
        { name: '温度', choices: [{label: '正常冰'}, {label: '少冰'}, {label: '去冰'}], required: true }
    ]
  },
  {
    id: 'm7', vendorId: 'v2',
    name: '暴打柠檬茶',
    description: '手打香水柠檬，酸爽过瘾。',
    price: 18,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600&h=600',
    category: '鲜榨果汁',
    options: [
        { name: '甜度', choices: [{label: '标准糖'}, {label: '七分糖'}, {label: '三分糖'}], required: true },
        { name: '温度', choices: [{label: '正常冰'}, {label: '少冰'}, {label: '去冰'}], required: true }
    ]
  },
  {
    id: 'm4', vendorId: 'v3',
    name: '香辣花甲',
    description: '猛火爆炒花甲，加入秘制香辣酱，鲜辣过瘾。',
    price: 38,
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=600&h=600',
    category: '海岛烧烤',
    isSpicy: true,
    options: [
        { name: '辣度', choices: [{label: '微辣'}, {label: '中辣'}, {label: '特辣'}], required: true }
    ]
  },
  {
    id: 'm5', vendorId: 'v3',
    name: '菠萝海鲜炒饭',
    description: '整只菠萝挖空，填入满满的海鲜炒饭，酸甜开胃。',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1534939561126-855f86654015?auto=format&fit=crop&q=80&w=600&h=600',
    category: '主食小吃',
  }
];

export const DEFAULT_ADDRESS: Address = {
    location: "后海村主海滩 3号遮阳伞旁",
    detail: "蓝色遮阳伞下，靠近救生塔",
    contactName: "演示用户",
    contactPhone: "00000000000"
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'o_pending_payment',
    orderNo: 'T20260102-000',
    vendorId: 'v2',
    vendorName: '后海村冲浪果汁',
    vendorImage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=200&h=200',
    vendorLocation: '沙滩 3号救生塔旁 黄色餐车',
    status: 'pending-payment',
    orderType: 'dine-in',
    statusHistory: [
      { status: 'pending-payment', at: '2026-01-02T18:10:00+08:00' }
    ],
    itemsSummary: '满杯西瓜桶 x1',
    detailedItems: [
        { productId: 'm6', name: '满杯西瓜桶', count: 1, price: 28, subtotal: 28, specs: ['正常冰'], imageUrl: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?auto=format&fit=crop&q=80&w=600&h=600' }
    ],
    subtotal: 28,
    packagingFee: 0,
    serviceFee: 0,
    discount: 0,
    totalPrice: 28,
    finalTotal: 28,
    date: '今天 18:10',
    createdAt: '2026-01-02T18:10:00+08:00',
    count: 1,
    paymentStatus: 'unpaid',
    paymentMethod: '微信支付'
  },
  {
    id: 'o_preparing_seafood',
    orderNo: 'T20260102-001',
    vendorId: 'v3',
    vendorName: '海风大排档',
    vendorImage: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=200&h=200',
    vendorLocation: '后海夜市 A区-05摊位',
    status: 'delivering',
    orderType: 'delivery',
    statusHistory: [
      { status: 'preparing', at: '2026-01-02T12:40:00+08:00' },
      { status: 'delivering', at: '2026-01-02T12:55:00+08:00' }
    ],
    itemsSummary: '香辣花甲 x1, 菠萝海鲜炒饭 x1',
    detailedItems: [
        { productId: 'm4', name: '香辣花甲', count: 1, price: 38, subtotal: 38, specs: ['中辣'], imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=600&h=600' },
        { productId: 'm5', name: '菠萝海鲜炒饭', count: 1, price: 45, subtotal: 45, imageUrl: 'https://images.unsplash.com/photo-1534939561126-855f86654015?auto=format&fit=crop&q=80&w=600&h=600' }
    ],
    subtotal: 83,
    packagingFee: 0,
    serviceFee: 0,
    deliveryFee: 5,
    discount: 0,
    totalPrice: 88,
    finalTotal: 88,
    date: '今天 12:45',
    createdAt: '2026-01-02T12:40:00+08:00',
    paidAt: '2026-01-02T12:42:00+08:00',
    count: 2,
    deliveryTime: '13:15',
    address: DEFAULT_ADDRESS,
    buyerName: DEFAULT_ADDRESS.contactName,
    buyerPhone: DEFAULT_ADDRESS.contactPhone,
    paymentStatus: 'paid',
    transactionId: 'DEMO-TRANSACTION',
    paymentMethod: '微信支付'
  },
  {
    id: 'o_preparing_dinein',
    orderNo: 'T20260102-002',
    vendorId: 'v1',
    vendorName: '阿婆椰子鸡',
    vendorImage: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=200&h=200',
    vendorLocation: '后海村主街 108号 (近大榕树)',
    status: 'preparing',
    orderType: 'dine-in',
    statusHistory: [
      { status: 'preparing', at: '2026-01-02T14:25:00+08:00' }
    ],
    pickupCode: 'B-102',
    boothCode: 'A区-12',
    pickupWindow: '14:30-14:45',
    itemsSummary: '招牌原味椰子鸡 x1',
    detailedItems: [
        { productId: 'm1', name: '招牌原味椰子鸡', count: 1, price: 128, subtotal: 128, specs: ['半只'], imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600&h=600' }
    ],
    subtotal: 128,
    packagingFee: 0,
    serviceFee: 0,
    discount: 0,
    totalPrice: 128,
    finalTotal: 128,
    date: '今天 14:30',
    createdAt: '2026-01-02T14:25:00+08:00',
    paidAt: '2026-01-02T14:26:00+08:00',
    count: 1,
    remarks: '麻烦多放点姜片',
    paymentStatus: 'paid',
    transactionId: 'DEMO-TRANSACTION',
    paymentMethod: '微信支付'
  },
  {
    id: 'o_ready_pickup',
    orderNo: 'T20260101-018',
    vendorId: 'v2',
    vendorName: '后海村冲浪果汁',
    vendorImage: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=200&h=200',
    vendorLocation: '沙滩 3号救生塔旁 黄色餐车',
    status: 'ready',
    orderType: 'dine-in',
    statusHistory: [
      { status: 'preparing', at: '2026-01-01T19:55:00+08:00' },
      { status: 'ready', at: '2026-01-01T20:05:00+08:00' }
    ],
    pickupCode: 'A-099',
    itemsSummary: '暴打柠檬茶 x1',
    detailedItems: [
        { productId: 'm7', name: '暴打柠檬茶', count: 1, price: 18, subtotal: 18, specs: ['标准糖', '正常冰'], imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600&h=600' },
    ],
    subtotal: 18,
    packagingFee: 0,
    serviceFee: 0,
    discount: 0,
    totalPrice: 18,
    finalTotal: 18,
    date: '10-24 20:05',
    createdAt: '2026-01-01T19:55:00+08:00',
    paidAt: '2026-01-01T19:56:00+08:00',
    count: 1,
    remarks: '少冰，尽快',
    paymentStatus: 'paid',
    transactionId: 'DEMO-TRANSACTION',
    paymentMethod: '微信支付'
  },
  {
    id: 'o_completed_chicken',
    orderNo: 'T20251231-066',
    vendorId: 'v1',
    vendorName: '阿婆椰子鸡',
    vendorImage: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=200&h=200',
    vendorLocation: '后海村主街 108号 (近大榕树)',
    status: 'completed',
    orderType: 'delivery',
    statusHistory: [
      { status: 'preparing', at: '2025-12-31T19:00:00+08:00' },
      { status: 'delivering', at: '2025-12-31T19:10:00+08:00' },
      { status: 'completed', at: '2025-12-31T19:20:00+08:00' }
    ],
    itemsSummary: '招牌原味椰子鸡 x1, 海南清补凉 x2',
    detailedItems: [
        { productId: 'm1', name: '招牌原味椰子鸡', count: 1, price: 128, subtotal: 128, specs: ['半只'], imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600&h=600' },
        { productId: 'm3', name: '海南清补凉', count: 2, price: 30, subtotal: 60, specs: ['椰奶冰沙'], imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=600&h=600' }
    ],
    subtotal: 188,
    packagingFee: 0,
    serviceFee: 0,
    deliveryFee: 0,
    discount: 25,
    couponId: 'NEW25',
    totalPrice: 163,
    finalTotal: 163,
    date: '昨天 19:20',
    createdAt: '2025-12-31T19:00:00+08:00',
    paidAt: '2025-12-31T19:01:00+08:00',
    completedAt: '2025-12-31T19:20:00+08:00',
    count: 3,
    remarks: '清补凉多加点珍珠',
    address: DEFAULT_ADDRESS,
    buyerName: DEFAULT_ADDRESS.contactName,
    buyerPhone: DEFAULT_ADDRESS.contactPhone,
    paymentStatus: 'paid',
    transactionId: 'DEMO-TRANSACTION',
    paymentMethod: '微信支付'
  }
];

export const getVendorProducts = (vendorId: string) => {
  return ALL_PRODUCTS.filter(p => p.vendorId === vendorId);
};

export const getProductById = (id: string) => {
  return ALL_PRODUCTS.find(p => p.id === id);
};

export const getVendorById = (id: string) => {
  return VENDORS.find(v => v.id === id);
};
