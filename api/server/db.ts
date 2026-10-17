import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ALL_PRODUCTS, DEFAULT_ADDRESS, INITIAL_ORDERS, VENDORS } from '../data';
import type { Address, MenuItem, Order, OrderItem, Vendor, SpecLike, SpecSelection, PaymentProof } from '../types';

const ROOT = process.cwd();
const envLocal = path.join(ROOT, '.env.local');
const envDefault = path.join(ROOT, '.env');

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}


const isProd = process.env.NODE_ENV === 'production';
// Seed fictional business data only when explicitly enabled or developing locally.
const DEMO_SEED = process.env.DEMO_SEED === undefined
  ? !isProd
  : process.env.DEMO_SEED.trim().toLowerCase() === 'true';
const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value && value.trim()) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env: ${key}`);
};

const MYSQL_HOST = requireEnv('MYSQL_HOST', '127.0.0.1');
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = requireEnv('MYSQL_USER', 'root');
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = requireEnv('MYSQL_DATABASE', 'tantan');
const MYSQL_POOL_LIMIT = Number(process.env.MYSQL_POOL_LIMIT || 10);
const ADMIN_USERNAME = requireEnv('ADMIN_USERNAME', isProd ? undefined : 'admin');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? '' : 'admin123456');
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

if (isProd && !ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  throw new Error('Missing required env: ADMIN_PASSWORD or ADMIN_PASSWORD_HASH');
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: MYSQL_POOL_LIMIT,
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

type Row = RowDataPacket & Record<string, unknown>;

type CartItemInput = {
  productId: string;
  count: number;
  specs: SpecSelection[];
};

export type CreateOrderInput = {
  items: CartItemInput[];
  mode: 'delivery' | 'dine-in';
  remarks?: Record<string, string>;
  deliveryTime?: string;
  paymentMethod?: string;
  buyerId?: string;
  buyerPhone?: string;
};

const DELIVERY_FEE = 5;
const DEFAULT_VENDOR_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800&h=800';
const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?auto=format&fit=crop&q=80&w=800&h=800';
const MAX_PAYMENT_PROOFS = 3;
const PASSWORD_PREFIX = 'scrypt$';

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return `${PASSWORD_PREFIX}${salt}$${derived.toString('hex')}`;
};

const isHashedPassword = (value: string): boolean => value.startsWith(PASSWORD_PREFIX);

const verifyPassword = (password: string, stored: string): boolean => {
  if (!stored) return false;
  if (!isHashedPassword(stored)) {
    return stored === password;
  }
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const hash = parts[2];
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  if (storedBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derived);
};

const normalizePassword = (password?: string | null): string | null => {
  if (!password) return null;
  const trimmed = password.trim();
  if (!trimmed) return null;
  return isHashedPassword(trimmed) ? trimmed : hashPassword(trimmed);
};

export type CreateVendorInput = {
  id?: string;
  code?: string;
  name: string;
  category: string;
  status?: Vendor['status'];
  isOpen?: boolean;
  rating?: number;
  imageUrl?: string;
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
  revenue?: number;
  password?: string;
};

export type CreateProductInput = {
  id?: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[];
  category: string;
  isSpicy?: boolean;
  isHot?: boolean;
  options?: MenuItem['options'];
  status?: MenuItem['status'];
  stockLimit?: number;
  dailySales?: number;
};

export type UpdateVendorInput = Partial<CreateVendorInput>;
export type UpdateProductInput = Partial<CreateProductInput>;

export type HelpCenterFaq = {
  question: string;
  answer: string;
};

export type AppConfig = {
  enableStats: boolean;
  enableProducts: boolean;
  enableOrders: boolean;
  enableSettings: boolean;
  systemMaintenance: boolean;
  enableClientReviews: boolean;
  showBusinessHours: boolean;
  showQualifications: boolean;
  showContactPhone: boolean;
  showMerchantSlogan: boolean;
  clientBaseUrl: string;
  helpCenterTitle: string;
  helpCenterHours: string;
  helpCenterContactLabel: string;
  helpCenterContactValue: string;
  helpCenterFaqs: HelpCenterFaq[];
};

const DEFAULT_APP_CONFIG: AppConfig = {
  enableStats: true,
  enableProducts: true,
  enableOrders: true,
  enableSettings: true,
  systemMaintenance: false,
  enableClientReviews: true,
  showBusinessHours: true,
  showQualifications: true,
  showContactPhone: true,
  showMerchantSlogan: true,
  clientBaseUrl: 'http://localhost:3000',
  helpCenterTitle: '\u5ba2\u670d\u5728\u7ebf\u65f6\u95f4',
  helpCenterHours: '10:00 - 24:00',
  helpCenterContactLabel: '\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d',
  helpCenterContactValue: 'kefu_wechat',
  helpCenterFaqs: [
    { question: '\u53ef\u4ee5\u7528\u73b0\u91d1\u652f\u4ed8\u5417\uFF1F', answer: '\u76ee\u524d\u652f\u6301\u5fae\u4fe1\u548c\u652f\u4ed8\u5b9d\u626b\u7801\u652f\u4ed8\uff0c\u6682\u4e0d\u652f\u6301\u73b0\u91d1\u3002' },
    { question: '\u4e0b\u5355\u540e\u53ef\u4ee5\u53d6\u6d88\u5417\uFF1F', answer: '\u53ef\u4ee5\uff0c\u8bf7\u5728\u672a\u5236\u4f5c\u524d\u53d6\u6d88\uff0c\u8be6\u60c5\u8bf7\u8054\u7cfb\u644a\u4e3b\u3002' },
    { question: '\u5982\u679c\u627e\u4e0d\u5230\u644a\u4f4d\u600e\u4e48\u529e\uFF1F', answer: '\u8bf7\u70b9\u51fb\u8054\u7cfb\u4eba\u5de5\u5ba2\u670d\uff0c\u6216\u62e8\u6253\u5546\u5bb6\u7535\u8bdd\u83b7\u53d6\u5e2e\u52a9\u3002' },
  ],
};

const parseJson = <T>(value: unknown): T | undefined => {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const normalizeHelpCenterFaqs = (value: unknown): HelpCenterFaq[] => {
  if (!Array.isArray(value)) return DEFAULT_APP_CONFIG.helpCenterFaqs;
  const normalized = value
    .map((item) => {
      if (typeof item === 'string') {
        const question = item.trim();
        return question ? { question, answer: '' } : null;
      }
      if (item && typeof item === 'object') {
        const record = item as { question?: unknown; answer?: unknown };
        const question = typeof record.question === 'string' ? record.question.trim() : '';
        const answer = typeof record.answer === 'string' ? record.answer.trim() : '';
        return question ? { question, answer } : null;
      }
      return null;
    })
    .filter((item): item is HelpCenterFaq => Boolean(item));
  return normalized.length > 0 ? normalized : DEFAULT_APP_CONFIG.helpCenterFaqs;
};

const formatOrderDate = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const toNumber = (value: unknown, fallback: number): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeSpecs = (specs?: SpecLike[]): SpecSelection[] => {
  if (!specs) return [];
  return specs.map((spec) => (typeof spec === 'string' ? { option: 'spec', label: spec } : spec));
};

const calculateItemPrice = (product: MenuItem, specs: SpecLike[] = []): number => {
  let total = product.price;
  if (!product.options) return total;

  const normalized = normalizeSpecs(specs);

  product.options.forEach((option) => {
    option.choices.forEach((choice) => {
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
const toVendor = (row: Row): Vendor => ({
  id: row.id as string,
  code: row.code as string,
  name: row.name as string,
  category: row.category as string,
  status: (row.status as Vendor['status']) || 'active',
  isOpen: row.isOpen !== null ? Boolean(row.isOpen) : true,
  rating: Number(row.rating),
  imageUrl: row.imageUrl as string,
  location: row.location as string,
  locationShort: (row.locationShort as string) || undefined,
  lastVisited: (row.lastVisited as string) || undefined,
  menuCategories: parseJson<string[]>(row.menuCategories),
  description: (row.description as string) || undefined,
  businessHours: (row.businessHours as string) || undefined,
  phone: (row.phone as string) || undefined,
  paymentWechatQr: (row.paymentWechatQr as string) || undefined,
  paymentAlipayQr: (row.paymentAlipayQr as string) || undefined,
  qualifications: parseJson<string[]>(row.qualifications),
  qualificationImage: (row.qualificationImage as string) || undefined,
  qualificationUploadedAt: (row.qualificationUploadedAt as string) || undefined,
  signImage: (row.signImage as string) || undefined,
  signUploadedAt: (row.signUploadedAt as string) || undefined,
  ownerName: (row.ownerName as string) || undefined,
  revenue: row.revenue !== null ? Number(row.revenue) : undefined,
  password: (row.password as string) || undefined,
  createdAt: (row.createdAt as string) || undefined,
});

const toProduct = (row: Row): MenuItem => ({
  id: row.id as string,
  vendorId: row.vendorId as string,
  name: row.name as string,
  description: row.description as string,
  price: Number(row.price),
  imageUrl: row.imageUrl as string,
  imageUrls: parseJson<string[]>(row.imageUrls),
  category: row.category as string,
  isSpicy: row.isSpicy ? Boolean(row.isSpicy) : undefined,
  isHot: row.isHot ? Boolean(row.isHot) : undefined,
  options: parseJson(row.options),
  status: (row.status as MenuItem['status']) || undefined,
  stockLimit: row.stockLimit !== null ? Number(row.stockLimit) : undefined,
  dailySales: row.dailySales !== null ? Number(row.dailySales) : undefined,
});

  const toOrder = (row: Row): Order => ({
  id: row.id as string,
  vendorId: row.vendorId as string,
  vendorName: row.vendorName as string,
  vendorImage: row.vendorImage as string,
  vendorLocation: (row.vendorLocation as string) || undefined,
  status: row.status as Order['status'],
  cancelReason: (row.cancelReason as string) || undefined,
  orderType: row.orderType as Order['orderType'],
  pickupCode: (row.pickupCode as string) || undefined,
  itemsSummary: row.itemsSummary as string,
  detailedItems: parseJson<OrderItem[]>(row.detailedItems),
  totalPrice: Number(row.totalPrice),
  date: row.date as string,
  createdAt: (row.createdAt as string) || undefined,
  count: Number(row.count),
  riderName: (row.riderName as string) || undefined,
  riderPhone: (row.riderPhone as string) || undefined,
  deliveryTime: (row.deliveryTime as string) || undefined,
    remarks: (row.remarks as string) || undefined,
    paymentMethod: (row.paymentMethod as string) || undefined,
    paymentStatus: (row.paymentStatus as Order['paymentStatus']) || undefined,
    paidAt: (row.paidAt as string) || undefined,
    completedAt: (row.completedAt as string) || undefined,
    statusUpdatedAt: (row.statusUpdatedAt as string) || undefined,
    address: parseJson<Address>(row.address),
    buyerId: (row.buyerId as string) || undefined,
    buyerPhone: (row.buyerPhone as string) || undefined,
    paymentProofs: parseJson<PaymentProof[]>(row.paymentProofs),
  });

const toAdmin = (row: Row): AdminAccount => ({
  id: row.id as string,
  username: row.username as string,
  passwordHash: row.passwordHash as string,
  createdAt: (row.createdAt as string) || undefined,
});

const ensureDatabase = async (): Promise<void> => {
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
};

const execute = async <T>(sql: string, params?: unknown): Promise<T> => {
  const [result] = await pool.execute(sql, params as never);
  return result as T;
};

const queryRows = async <T>(sql: string, params?: unknown): Promise<T[]> => {
  const [rows] = await pool.execute(sql, params as never);
  return rows as T[];
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const rows = await queryRows<{ count: number }>(
    'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
    [MYSQL_DATABASE, table, column]
  );
  return (rows[0]?.count ?? 0) > 0;
};

const addColumnIfMissing = async (table: string, column: string, definition: string): Promise<void> => {
  if (await columnExists(table, column)) return;
  await execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
};

const getColumnInfo = async (
  table: string,
  column: string
): Promise<{ dataType?: string } | null> => {
  const rows = await queryRows<{ dataType?: string }>(
    'SELECT DATA_TYPE as dataType FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
    [MYSQL_DATABASE, table, column]
  );
  return rows[0] ?? null;
};

const ensureTextColumn = async (table: string, column: string, definition: string): Promise<void> => {
  const info = await getColumnInfo(table, column);
  if (!info?.dataType) return;
  const type = info.dataType.toLowerCase();
  if (type === 'mediumtext' || type === 'longtext') return;
  await execute(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
};

const ensureSchema = async (): Promise<void> => {
  const statements = [
    `
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        isOpen TINYINT NOT NULL DEFAULT 1,
        rating DECIMAL(6,2) NOT NULL,
        imageUrl TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        locationShort VARCHAR(255),
        lastVisited VARCHAR(255),
        menuCategories TEXT,
        description TEXT,
        businessHours VARCHAR(255),
        phone VARCHAR(64),
        paymentWechatQr TEXT,
        paymentAlipayQr TEXT,
        qualifications TEXT,
        qualificationImage TEXT,
        qualificationUploadedAt VARCHAR(64),
        signImage TEXT,
        signUploadedAt VARCHAR(64),
        ownerName VARCHAR(255),
        revenue DECIMAL(12,2) DEFAULT 0,
        password VARCHAR(255),
        createdAt VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
    `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        vendorId VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        imageUrl TEXT NOT NULL,
        imageUrls TEXT,
        category VARCHAR(255) NOT NULL,
        isSpicy TINYINT,
        isHot TINYINT,
        options TEXT,
        status VARCHAR(32) DEFAULT 'available',
        stockLimit INT DEFAULT 0,
        dailySales INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
    `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        vendorId VARCHAR(64) NOT NULL,
        vendorName VARCHAR(255) NOT NULL,
        vendorImage TEXT NOT NULL,
        vendorLocation VARCHAR(255),
        buyerId VARCHAR(64),
        buyerPhone VARCHAR(64),
        status VARCHAR(32) NOT NULL,
        cancelReason TEXT,
        orderType VARCHAR(32) NOT NULL,
        pickupCode VARCHAR(64),
        itemsSummary TEXT NOT NULL,
        detailedItems TEXT,
        totalPrice DECIMAL(12,2) NOT NULL,
        date VARCHAR(64) NOT NULL,
        count INT NOT NULL,
        riderName VARCHAR(255),
        riderPhone VARCHAR(64),
        deliveryTime VARCHAR(255),
        remarks TEXT,
        paymentMethod VARCHAR(64),
        paymentStatus VARCHAR(32),
        paidAt VARCHAR(64),
        completedAt VARCHAR(64),
        statusUpdatedAt VARCHAR(64),
        paymentProofs MEDIUMTEXT,
        address TEXT,
        createdAt VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
    `
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
    `
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
  ];

  for (const statement of statements) {
    await execute(statement);
  }

  // Backfill columns when upgrading existing databases.
  await addColumnIfMissing('vendors', 'locationShort', 'VARCHAR(255)');
  await addColumnIfMissing('vendors', 'qualificationImage', 'TEXT');
  await addColumnIfMissing('vendors', 'qualificationUploadedAt', 'VARCHAR(64)');
  await addColumnIfMissing('vendors', 'signImage', 'TEXT');
  await addColumnIfMissing('vendors', 'signUploadedAt', 'VARCHAR(64)');
  await addColumnIfMissing('products', 'imageUrls', 'TEXT');
  await addColumnIfMissing('orders', 'buyerId', 'VARCHAR(64)');
  await addColumnIfMissing('orders', 'buyerPhone', 'VARCHAR(64)');
  await addColumnIfMissing('orders', 'paymentStatus', 'VARCHAR(32)');
  await addColumnIfMissing('orders', 'paidAt', 'VARCHAR(64)');
  await addColumnIfMissing('orders', 'completedAt', 'VARCHAR(64)');
  await addColumnIfMissing('orders', 'statusUpdatedAt', 'VARCHAR(64)');
  await addColumnIfMissing('orders', 'paymentProofs', 'MEDIUMTEXT');

  await ensureTextColumn('vendors', 'imageUrl', 'MEDIUMTEXT NOT NULL');
  await ensureTextColumn('vendors', 'paymentWechatQr', 'MEDIUMTEXT');
  await ensureTextColumn('vendors', 'paymentAlipayQr', 'MEDIUMTEXT');
  await ensureTextColumn('vendors', 'qualifications', 'MEDIUMTEXT');
  await ensureTextColumn('vendors', 'qualificationImage', 'MEDIUMTEXT');
  await ensureTextColumn('vendors', 'signImage', 'MEDIUMTEXT');
  await ensureTextColumn('products', 'imageUrl', 'MEDIUMTEXT NOT NULL');
  await ensureTextColumn('products', 'imageUrls', 'MEDIUMTEXT');
  await ensureTextColumn('orders', 'vendorImage', 'MEDIUMTEXT NOT NULL');
  await ensureTextColumn('orders', 'detailedItems', 'MEDIUMTEXT');
};
const seedIfEmpty = async (): Promise<void> => {
  const vendorCountRows = await queryRows<{ count: number }>('SELECT COUNT(1) as count FROM vendors');
  if (DEMO_SEED && vendorCountRows[0]?.count === 0) {
    const insertVendor = `
      INSERT INTO vendors (
        id, code, name, category, status, isOpen, rating, imageUrl, location, locationShort, lastVisited,
        menuCategories, description, businessHours, phone, paymentWechatQr, paymentAlipayQr, qualifications,
        qualificationImage, qualificationUploadedAt, signImage, signUploadedAt,
        ownerName, revenue, password, createdAt
      ) VALUES (
        :id, :code, :name, :category, :status, :isOpen, :rating, :imageUrl, :location, :locationShort, :lastVisited,
        :menuCategories, :description, :businessHours, :phone, :paymentWechatQr, :paymentAlipayQr, :qualifications,
        :qualificationImage, :qualificationUploadedAt, :signImage, :signUploadedAt,
        :ownerName, :revenue, :password, :createdAt
      )
    `;

    for (const vendor of VENDORS) {
      await execute(insertVendor, {
        ...vendor,
        status: vendor.status || 'active',
        isOpen: vendor.isOpen === undefined ? 1 : vendor.isOpen ? 1 : 0,
        lastVisited: vendor.lastVisited || null,
        menuCategories: vendor.menuCategories ? JSON.stringify(vendor.menuCategories) : null,
        description: vendor.description || null,
        businessHours: vendor.businessHours || null,
        phone: vendor.phone || null,
        paymentWechatQr: vendor.paymentWechatQr || null,
        paymentAlipayQr: vendor.paymentAlipayQr || null,
        qualifications: vendor.qualifications ? JSON.stringify(vendor.qualifications) : null,
        locationShort: (vendor as Vendor).locationShort || null,
        qualificationImage: (vendor as Vendor).qualificationImage || null,
        qualificationUploadedAt: (vendor as Vendor).qualificationUploadedAt || null,
        signImage: (vendor as Vendor).signImage || null,
        signUploadedAt: (vendor as Vendor).signUploadedAt || null,
        ownerName: vendor.ownerName || null,
        revenue: vendor.revenue ?? 0,
        password: normalizePassword((vendor as { password?: string }).password) || null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const productCountRows = await queryRows<{ count: number }>('SELECT COUNT(1) as count FROM products');
  if (DEMO_SEED && productCountRows[0]?.count === 0) {
    const insertProduct = `
      INSERT INTO products (
        id, vendorId, name, description, price, imageUrl, imageUrls, category, isSpicy, isHot, options, status, stockLimit, dailySales
      ) VALUES (
        :id, :vendorId, :name, :description, :price, :imageUrl, :imageUrls, :category, :isSpicy, :isHot, :options, :status, :stockLimit, :dailySales
      )
    `;

    for (const product of ALL_PRODUCTS) {
      await execute(insertProduct, {
        ...product,
        isSpicy: product.isSpicy ? 1 : 0,
        isHot: product.isHot ? 1 : 0,
        imageUrls: product.imageUrls ? JSON.stringify(product.imageUrls) : null,
        options: product.options ? JSON.stringify(product.options) : null,
        status: product.status || 'available',
        stockLimit: product.stockLimit ?? 0,
        dailySales: product.dailySales ?? 0,
      });
    }
  }

  const orderCountRows = await queryRows<{ count: number }>('SELECT COUNT(1) as count FROM orders');
  if (DEMO_SEED && orderCountRows[0]?.count === 0 && INITIAL_ORDERS.length > 0) {
      const insertOrder = `
        INSERT INTO orders (
          id, vendorId, vendorName, vendorImage, vendorLocation, status, cancelReason, orderType, pickupCode,
          itemsSummary, detailedItems, totalPrice, date, count, riderName, riderPhone, deliveryTime,
          remarks, paymentMethod, paymentStatus, paidAt, completedAt, statusUpdatedAt, paymentProofs, address, createdAt
        ) VALUES (
          :id, :vendorId, :vendorName, :vendorImage, :vendorLocation, :status, :cancelReason, :orderType, :pickupCode,
          :itemsSummary, :detailedItems, :totalPrice, :date, :count, :riderName, :riderPhone, :deliveryTime,
          :remarks, :paymentMethod, :paymentStatus, :paidAt, :completedAt, :statusUpdatedAt, :paymentProofs, :address, :createdAt
        )
      `;

    for (const order of INITIAL_ORDERS) {
        const statusUpdatedAt =
          (order as Order).statusUpdatedAt ||
          order.completedAt ||
          order.paidAt ||
          order.date ||
          new Date().toISOString();
        await execute(insertOrder, {
          ...order,
          vendorLocation: order.vendorLocation || null,
          cancelReason: order.cancelReason || null,
          pickupCode: order.pickupCode || null,
        detailedItems: order.detailedItems ? JSON.stringify(order.detailedItems) : null,
        riderName: order.riderName || null,
        riderPhone: order.riderPhone || null,
          deliveryTime: order.deliveryTime || null,
          remarks: order.remarks || null,
          paymentMethod: order.paymentMethod || null,
          paymentStatus: order.paymentStatus || null,
          paidAt: order.paidAt || null,
          completedAt: order.completedAt || null,
          statusUpdatedAt,
          paymentProofs: order.paymentProofs ? JSON.stringify(order.paymentProofs) : null,
          address: order.address ? JSON.stringify(order.address) : null,
          createdAt: new Date().toISOString(),
        });
      }
  }

  if (DEMO_SEED) {
    const missingPasswords = await queryRows<{ id: string; code: string }>(
      `SELECT id, code FROM vendors WHERE password IS NULL OR password = ''`
    );

    for (const row of missingPasswords) {
      const hashed = hashPassword(`TT${row.code}`);
      await execute<ResultSetHeader>('UPDATE vendors SET password = ? WHERE id = ?', [hashed, row.id]);
    }
  }

  const defaultAddressRows = await queryRows<{ value: string }>(
    'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
    ['defaultAddress']
  );
  if (DEMO_SEED && defaultAddressRows.length === 0) {
    await execute<ResultSetHeader>('INSERT INTO settings (`key`, value) VALUES (?, ?)', [
      'defaultAddress',
      JSON.stringify(DEFAULT_ADDRESS),
    ]);
  }

  const appConfigRows = await queryRows<{ value: string }>(
    'SELECT value FROM settings WHERE `key` = ? LIMIT 1',
    ['appConfig']
  );
  if (appConfigRows.length === 0) {
    await execute<ResultSetHeader>('INSERT INTO settings (`key`, value) VALUES (?, ?)', [
      'appConfig',
      JSON.stringify(DEFAULT_APP_CONFIG),
    ]);
  }

  const adminCountRows = await queryRows<{ count: number }>('SELECT COUNT(1) as count FROM admins');
  if (adminCountRows[0]?.count === 0) {
    const username = ADMIN_USERNAME.trim() || 'admin';
    const passwordHash =
      normalizePassword(ADMIN_PASSWORD_HASH || ADMIN_PASSWORD) || hashPassword('admin123456');
    await execute<ResultSetHeader>(
      'INSERT INTO admins (id, username, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
      [generateId('admin'), username, passwordHash, new Date().toISOString()]
    );
  }
};

export const initDb = async (): Promise<void> => {
  await ensureDatabase();
  await ensureSchema();
  await seedIfEmpty();
};

export const getVendors = async (): Promise<Vendor[]> => {
  const rows = await queryRows<Row>('SELECT * FROM vendors ORDER BY name');
  return rows.map(toVendor);
};

export const getVendorById = async (id: string): Promise<Vendor | null> => {
  const rows = await queryRows<Row>('SELECT * FROM vendors WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? toVendor(rows[0]) : null;
};

const getVendorRowByCode = async (code: string): Promise<Row | undefined> => {
  const rows = await queryRows<Row>('SELECT * FROM vendors WHERE code = ? LIMIT 1', [code]);
  return rows[0];
};

const isVendorCodeAvailable = async (code: string, excludeId?: string): Promise<boolean> => {
  const rows = await queryRows<Row>('SELECT id FROM vendors WHERE code = ? LIMIT 1', [code]);
  if (!rows[0]) return true;
  if (excludeId && rows[0].id === excludeId) return true;
  return false;
};

const getAdminByUsername = async (username: string): Promise<AdminAccount | null> => {
  const rows = await queryRows<Row>('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);
  return rows[0] ? toAdmin(rows[0]) : null;
};

export const loginMerchant = async (code: string, password: string): Promise<Vendor> => {
  const row = await getVendorRowByCode(code);
  if (!row) {
    throw new Error('Invalid vendor code or password');
  }

  const storedPassword = typeof row.password === 'string' ? row.password : '';
  if (!storedPassword || !verifyPassword(password, storedPassword)) {
    throw new Error('Invalid vendor code or password');
  }
  if (!isHashedPassword(storedPassword)) {
    const hashed = hashPassword(password);
    await execute<ResultSetHeader>('UPDATE vendors SET password = ? WHERE id = ?', [hashed, row.id]);
  }

  const vendor = toVendor(row);
  if (vendor.status === 'banned') {
    throw new Error('Vendor is banned');
  }
  return vendor;
};

export const loginAdmin = async (username: string, password: string): Promise<AdminAccount> => {
  const admin = await getAdminByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    throw new Error('Invalid admin username or password');
  }
  if (!isHashedPassword(admin.passwordHash)) {
    const hashed = hashPassword(password);
    await execute<ResultSetHeader>('UPDATE admins SET passwordHash = ? WHERE id = ?', [hashed, admin.id]);
    return { ...admin, passwordHash: hashed };
  }
  return admin;
};

export const getProducts = async (): Promise<MenuItem[]> => {
  const rows = await queryRows<Row>('SELECT * FROM products ORDER BY name');
  return rows.map(toProduct);
};

export const getProductById = async (id: string): Promise<MenuItem | null> => {
  const rows = await queryRows<Row>('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? toProduct(rows[0]) : null;
};

export const getProductsByVendor = async (vendorId: string): Promise<MenuItem[]> => {
  const rows = await queryRows<Row>('SELECT * FROM products WHERE vendorId = ? ORDER BY name', [vendorId]);
  return rows.map(toProduct);
};

type OrderFilters = {
  buyerId?: string;
  buyerPhone?: string;
  vendorId?: string;
};

type AdminAccount = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt?: string;
};

export const getOrders = async (filters: OrderFilters = {}): Promise<Order[]> => {
  const normalizedPhone = typeof filters.buyerPhone === 'string'
    ? filters.buyerPhone.replace(/\D/g, '')
    : '';
  if (filters.vendorId) {
    const rows = await queryRows<Row>('SELECT * FROM orders WHERE vendorId = ? ORDER BY createdAt ASC', [
      filters.vendorId,
    ]);
    return rows.map(toOrder);
  }
  if (normalizedPhone) {
    const rows = await queryRows<Row>('SELECT * FROM orders WHERE buyerPhone LIKE ? ORDER BY createdAt ASC', [
      `%${normalizedPhone}`,
    ]);
    return rows.map(toOrder);
  }
  if (filters.buyerId) {
    const rows = await queryRows<Row>('SELECT * FROM orders WHERE buyerId = ? ORDER BY createdAt ASC', [
      filters.buyerId,
    ]);
    return rows.map(toOrder);
  }
  const rows = await queryRows<Row>('SELECT * FROM orders ORDER BY createdAt ASC');
  return rows.map(toOrder);
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const rows = await queryRows<Row>('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? toOrder(rows[0]) : null;
};

export const getDefaultAddress = async (): Promise<Address | null> => {
  const rows = await queryRows<{ value: string }>('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [
    'defaultAddress',
  ]);
  if (!rows[0]?.value) return null;
  return parseJson<Address>(rows[0].value) || null;
};

export const getAppConfig = async (): Promise<AppConfig> => {
  const rows = await queryRows<{ value: string }>('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [
    'appConfig',
  ]);
  if (!rows[0]?.value) {
    await execute<ResultSetHeader>('INSERT INTO settings (`key`, value) VALUES (?, ?)', [
      'appConfig',
      JSON.stringify(DEFAULT_APP_CONFIG),
    ]);
    return DEFAULT_APP_CONFIG;
  }
  const parsed = parseJson<Partial<AppConfig>>(rows[0].value);
  const merged = { ...DEFAULT_APP_CONFIG, ...(parsed || {}) };
  return {
    ...merged,
    helpCenterFaqs: normalizeHelpCenterFaqs(merged.helpCenterFaqs),
    helpCenterContactValue:
      typeof merged.helpCenterContactValue === 'string' && merged.helpCenterContactValue.trim().length > 0
        ? merged.helpCenterContactValue.trim()
        : DEFAULT_APP_CONFIG.helpCenterContactValue,
  };
};

const DELIVERY_URGE_KEY = 'deliveryUrgeCounts';

const parseUrgeCounts = (value?: string): Record<string, number> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, val]) => {
      const count = typeof val === 'number' ? val : Number(val);
      if (Number.isFinite(count) && count > 0) {
        acc[key] = Math.floor(count);
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

export const getDeliveryUrgeCounts = async (): Promise<Record<string, number>> => {
  const rows = await queryRows<{ value: string }>('SELECT value FROM settings WHERE `key` = ? LIMIT 1', [
    DELIVERY_URGE_KEY,
  ]);
  return parseUrgeCounts(rows[0]?.value);
};

export const incrementDeliveryUrgeCounts = async (vendorIds: string[]): Promise<Record<string, number>> => {
  const counts = await getDeliveryUrgeCounts();
  const uniqueVendorIds = Array.from(new Set(vendorIds.filter(Boolean)));
  uniqueVendorIds.forEach((vendorId) => {
    counts[vendorId] = (counts[vendorId] || 0) + 1;
  });
  await execute<ResultSetHeader>(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [DELIVERY_URGE_KEY, JSON.stringify(counts)]
  );
  return counts;
};

export const updateAppConfig = async (config: Partial<AppConfig>): Promise<AppConfig> => {
  const current = await getAppConfig();
  const nextConfig = {
    ...current,
    ...config,
  };
  nextConfig.helpCenterFaqs = normalizeHelpCenterFaqs(nextConfig.helpCenterFaqs);
  nextConfig.helpCenterContactValue =
    typeof nextConfig.helpCenterContactValue === 'string' && nextConfig.helpCenterContactValue.trim().length > 0
      ? nextConfig.helpCenterContactValue.trim()
      : current.helpCenterContactValue;
  nextConfig.clientBaseUrl =
    typeof nextConfig.clientBaseUrl === 'string' && nextConfig.clientBaseUrl.trim().length > 0
      ? nextConfig.clientBaseUrl.trim()
      : current.clientBaseUrl;
  await execute<ResultSetHeader>(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    ['appConfig', JSON.stringify(nextConfig)]
  );
  return nextConfig;
};
export const createVendor = async (input: CreateVendorInput): Promise<Vendor> => {
  const id = input.id?.trim() || generateId('v');
  let code = input.code?.trim();
  const name = input.name?.trim();
  const category = input.category?.trim();
  const location = input.location?.trim();
  const locationShort = input.locationShort?.trim() || location;

  if (!name || !category || !location) {
    throw new Error('Name, category, and location are required');
  }

  const rating = toNumber(input.rating, 4.6);
  const imageUrl = input.imageUrl?.trim() || DEFAULT_VENDOR_IMAGE;
  const passwordHash = normalizePassword(input.password);

  const existingRows = await queryRows<Row>('SELECT id FROM vendors WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length > 0) {
    throw new Error('Vendor id already exists');
  }
  if (code) {
    const available = await isVendorCodeAvailable(code);
    if (!available) {
      throw new Error('Vendor code already exists');
    }
  } else {
    let attempt = 0;
    do {
      code = `TT${Math.floor(100 + Math.random() * 900)}`;
      attempt += 1;
      if (attempt > 50) {
        throw new Error('Failed to generate unique vendor code');
      }
    } while (!(await isVendorCodeAvailable(code)));
  }

  const insertVendor = `
    INSERT INTO vendors (
      id, code, name, category, status, isOpen, rating, imageUrl, location, locationShort, lastVisited,
      menuCategories, description, businessHours, phone, paymentWechatQr, paymentAlipayQr, qualifications,
      qualificationImage, qualificationUploadedAt, signImage, signUploadedAt,
      ownerName, revenue, password, createdAt
    ) VALUES (
      :id, :code, :name, :category, :status, :isOpen, :rating, :imageUrl, :location, :locationShort, :lastVisited,
      :menuCategories, :description, :businessHours, :phone, :paymentWechatQr, :paymentAlipayQr, :qualifications,
      :qualificationImage, :qualificationUploadedAt, :signImage, :signUploadedAt,
      :ownerName, :revenue, :password, :createdAt
    )
  `;

  await execute<ResultSetHeader>(insertVendor, {
    id,
    code,
    name,
    category,
    status: input.status || 'active',
    isOpen: input.isOpen === undefined ? 1 : input.isOpen ? 1 : 0,
    rating,
    imageUrl,
    location,
    locationShort: locationShort || null,
    lastVisited: input.lastVisited || null,
    menuCategories: input.menuCategories ? JSON.stringify(input.menuCategories) : null,
    description: input.description || null,
    businessHours: input.businessHours || null,
    phone: input.phone || null,
    paymentWechatQr: input.paymentWechatQr || null,
    paymentAlipayQr: input.paymentAlipayQr || null,
    qualifications: input.qualifications ? JSON.stringify(input.qualifications) : null,
    qualificationImage: input.qualificationImage || null,
    qualificationUploadedAt: input.qualificationUploadedAt || null,
    signImage: input.signImage || null,
    signUploadedAt: input.signUploadedAt || null,
    ownerName: input.ownerName || null,
    revenue: input.revenue ?? 0,
    password: passwordHash,
    createdAt: new Date().toISOString(),
  });

  const vendor = await getVendorById(id);
  if (!vendor) {
    throw new Error('Failed to create vendor');
  }
  return vendor;
};

export const updateVendor = async (id: string, input: UpdateVendorInput): Promise<Vendor> => {
  const existing = await getVendorById(id);
  if (!existing) {
    throw new Error('Vendor not found');
  }

  const normalizedPassword =
    input.password !== undefined ? normalizePassword(input.password) : undefined;
  const nextCode = input.code?.trim();
  if (nextCode && nextCode !== existing.code) {
    const available = await isVendorCodeAvailable(nextCode, id);
    if (!available) {
      throw new Error('Vendor code already exists');
    }
  }

  const updated: Vendor = {
    ...existing,
    ...input,
    code: input.code?.trim() || existing.code,
    name: input.name?.trim() || existing.name,
    category: input.category?.trim() || existing.category,
    location: input.location?.trim() || existing.location,
    rating: input.rating !== undefined ? toNumber(input.rating, existing.rating) : existing.rating,
    imageUrl:
      input.imageUrl !== undefined
        ? typeof input.imageUrl === 'string'
          ? input.imageUrl.trim()
          : ''
        : existing.imageUrl,
    locationShort: input.locationShort !== undefined ? input.locationShort : existing.locationShort,
    lastVisited: input.lastVisited !== undefined ? input.lastVisited : existing.lastVisited,
    menuCategories: input.menuCategories !== undefined ? input.menuCategories : existing.menuCategories,
    description: input.description !== undefined ? input.description : existing.description,
    businessHours: input.businessHours !== undefined ? input.businessHours : existing.businessHours,
    phone: input.phone !== undefined ? input.phone : existing.phone,
    paymentWechatQr: input.paymentWechatQr !== undefined ? input.paymentWechatQr : existing.paymentWechatQr,
    paymentAlipayQr: input.paymentAlipayQr !== undefined ? input.paymentAlipayQr : existing.paymentAlipayQr,
    qualifications: input.qualifications !== undefined ? input.qualifications : existing.qualifications,
    qualificationImage: input.qualificationImage !== undefined ? input.qualificationImage : existing.qualificationImage,
    qualificationUploadedAt:
      input.qualificationUploadedAt !== undefined ? input.qualificationUploadedAt : existing.qualificationUploadedAt,
    signImage: input.signImage !== undefined ? input.signImage : existing.signImage,
    signUploadedAt: input.signUploadedAt !== undefined ? input.signUploadedAt : existing.signUploadedAt,
    status: input.status || existing.status || 'active',
    isOpen: input.isOpen !== undefined ? input.isOpen : existing.isOpen ?? true,
    ownerName: input.ownerName !== undefined ? input.ownerName : existing.ownerName,
    revenue: input.revenue !== undefined ? input.revenue : existing.revenue,
  };

  const updateStmt = `
    UPDATE vendors SET
      code = :code,
      name = :name,
      category = :category,
      status = :status,
      isOpen = :isOpen,
      rating = :rating,
      imageUrl = :imageUrl,
      location = :location,
      locationShort = :locationShort,
      lastVisited = :lastVisited,
      menuCategories = :menuCategories,
      description = :description,
      businessHours = :businessHours,
      phone = :phone,
      paymentWechatQr = :paymentWechatQr,
      paymentAlipayQr = :paymentAlipayQr,
      qualifications = :qualifications,
      qualificationImage = :qualificationImage,
      qualificationUploadedAt = :qualificationUploadedAt,
      signImage = :signImage,
      signUploadedAt = :signUploadedAt,
      ownerName = :ownerName,
      revenue = :revenue,
      password = COALESCE(:password, password)
    WHERE id = :id
  `;

  await execute<ResultSetHeader>(updateStmt, {
    id,
    code: updated.code,
    name: updated.name,
    category: updated.category,
    status: updated.status || 'active',
    isOpen: updated.isOpen ? 1 : 0,
    rating: updated.rating,
    imageUrl: updated.imageUrl,
    location: updated.location,
    locationShort: updated.locationShort || null,
    lastVisited: updated.lastVisited || null,
    menuCategories: updated.menuCategories ? JSON.stringify(updated.menuCategories) : null,
    description: updated.description || null,
    businessHours: updated.businessHours || null,
    phone: updated.phone || null,
    paymentWechatQr: updated.paymentWechatQr || null,
    paymentAlipayQr: updated.paymentAlipayQr || null,
    qualifications: updated.qualifications ? JSON.stringify(updated.qualifications) : null,
    qualificationImage: updated.qualificationImage || null,
    qualificationUploadedAt: updated.qualificationUploadedAt || null,
    signImage: updated.signImage || null,
    signUploadedAt: updated.signUploadedAt || null,
    ownerName: updated.ownerName || null,
    revenue: updated.revenue ?? 0,
    password: normalizedPassword === undefined ? null : normalizedPassword,
  });

  const vendor = await getVendorById(id);
  if (!vendor) {
    throw new Error('Failed to update vendor');
  }
  return vendor;
};

export const deleteVendor = async (id: string): Promise<void> => {
  const existing = await getVendorById(id);
  if (!existing) {
    throw new Error('Vendor not found');
  }
  await execute<ResultSetHeader>('DELETE FROM products WHERE vendorId = ?', [id]);
  await execute<ResultSetHeader>('DELETE FROM orders WHERE vendorId = ?', [id]);
  await execute<ResultSetHeader>('DELETE FROM vendors WHERE id = ?', [id]);
};

export const createProduct = async (input: CreateProductInput): Promise<MenuItem> => {
  const vendor = await getVendorById(input.vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const id = input.id?.trim() || generateId('p');
  const name = input.name?.trim();
  const description = input.description?.trim() || '';
  const category = input.category?.trim();
  const price = toNumber(input.price, NaN);

  if (!name || !category || !Number.isFinite(price)) {
    throw new Error('Name, category, and price are required');
  }

  const normalizedImageUrls = (input.imageUrls || [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 5);
  const imageUrl = normalizedImageUrls[0] || input.imageUrl?.trim() || DEFAULT_PRODUCT_IMAGE;

  const existingRows = await queryRows<Row>('SELECT id FROM products WHERE id = ? LIMIT 1', [id]);
  if (existingRows.length > 0) {
    throw new Error('Product id already exists');
  }

  const insertProduct = `
    INSERT INTO products (
      id, vendorId, name, description, price, imageUrl, imageUrls, category, isSpicy, isHot, options, status, stockLimit, dailySales
    ) VALUES (
      :id, :vendorId, :name, :description, :price, :imageUrl, :imageUrls, :category, :isSpicy, :isHot, :options, :status, :stockLimit, :dailySales
    )
  `;

  await execute<ResultSetHeader>(insertProduct, {
    id,
    vendorId: input.vendorId,
    name,
    description,
    price,
    imageUrl,
    imageUrls: normalizedImageUrls.length > 0 ? JSON.stringify(normalizedImageUrls) : null,
    category,
    isSpicy: input.isSpicy ? 1 : 0,
    isHot: input.isHot ? 1 : 0,
    options: input.options ? JSON.stringify(input.options) : null,
    status: input.status || 'available',
    stockLimit: input.stockLimit ?? 0,
    dailySales: input.dailySales ?? 0,
  });

  const product = await getProductById(id);
  if (!product) {
    throw new Error('Failed to create product');
  }
  return product;
};

export const updateProduct = async (id: string, input: UpdateProductInput): Promise<MenuItem> => {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error('Product not found');
  }

  const updated: MenuItem = {
    ...existing,
    ...input,
    vendorId: input.vendorId || existing.vendorId,
    name: input.name?.trim() || existing.name,
    description: input.description?.trim() || existing.description,
    category: input.category?.trim() || existing.category,
    price: input.price !== undefined ? toNumber(input.price, existing.price) : existing.price,
    imageUrls:
      input.imageUrls !== undefined
        ? input.imageUrls
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item.length > 0)
            .slice(0, 5)
        : existing.imageUrls,
      imageUrl:
        input.imageUrl !== undefined
          ? typeof input.imageUrl === 'string'
            ? input.imageUrl.trim()
            : ''
          : existing.imageUrl,
    isSpicy: input.isSpicy !== undefined ? input.isSpicy : existing.isSpicy,
    isHot: input.isHot !== undefined ? input.isHot : existing.isHot,
    options: input.options !== undefined ? input.options : existing.options,
    status: input.status || existing.status,
    stockLimit: input.stockLimit !== undefined ? input.stockLimit : existing.stockLimit,
    dailySales: input.dailySales !== undefined ? input.dailySales : existing.dailySales,
  };
  const normalizedImageUrls =
    updated.imageUrls && updated.imageUrls.length > 0 ? updated.imageUrls : undefined;
  const primaryImageUrl = normalizedImageUrls?.[0] || updated.imageUrl;

  const updateStmt = `
    UPDATE products SET
      vendorId = :vendorId,
      name = :name,
      description = :description,
      price = :price,
      imageUrl = :imageUrl,
      imageUrls = :imageUrls,
      category = :category,
      isSpicy = :isSpicy,
      isHot = :isHot,
      options = :options,
      status = :status,
      stockLimit = :stockLimit,
      dailySales = :dailySales
    WHERE id = :id
  `;

  await execute<ResultSetHeader>(updateStmt, {
    id,
    vendorId: updated.vendorId,
    name: updated.name,
    description: updated.description,
    price: updated.price,
    imageUrl: primaryImageUrl,
    imageUrls: normalizedImageUrls ? JSON.stringify(normalizedImageUrls) : null,
    category: updated.category,
    isSpicy: updated.isSpicy ? 1 : 0,
    isHot: updated.isHot ? 1 : 0,
    options: updated.options ? JSON.stringify(updated.options) : null,
    status: updated.status || 'available',
    stockLimit: updated.stockLimit ?? 0,
    dailySales: updated.dailySales ?? 0,
  });

  const product = await getProductById(id);
  if (!product) {
    throw new Error('Failed to update product');
  }
  return product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await execute<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
};
export const createOrders = async (input: CreateOrderInput): Promise<Order[]> => {
  const { items, mode, remarks, deliveryTime, paymentMethod, buyerId, buyerPhone } = input;
  if (!items || items.length === 0) return [];

  const products = await getProducts();
  const vendors = await getVendors();

  const productMap = new Map(products.map((product) => [product.id, product]));
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const productCounts = new Map<string, number>();

  const groups = new Map<
    string,
    { vendor: Vendor; items: { product: MenuItem; count: number; specs: SpecSelection[] }[] }
  >();

  items.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Unknown product: ${item.productId}`);
    }
    if (product.status === 'soldout') {
      throw new Error(`${product.name}已售罄`);
    }
    if (product.options && item.specs && item.specs.length > 0) {
      item.specs.forEach((spec) => {
        const option = product.options?.find((opt) => opt.name === spec.option);
        const choice = option?.choices.find((optChoice) => optChoice.label === spec.label);
        if (choice?.isSoldOut) {
          throw new Error(`${product.name} - ${spec.label}已售罄`);
        }
      });
    }

    const vendor = vendorMap.get(product.vendorId);
    if (!vendor) {
      throw new Error(`Unknown vendor: ${product.vendorId}`);
    }
    if (vendor.isOpen === false || vendor.status === 'banned') {
      throw new Error(`${vendor.name}已打烊`);
    }

    const currentCount = productCounts.get(product.id) || 0;
    productCounts.set(product.id, currentCount + item.count);

    const group = groups.get(vendor.id) || { vendor, items: [] };
    group.items.push({ product, count: item.count, specs: item.specs || [] });
    groups.set(vendor.id, group);
  });

    productCounts.forEach((count, productId) => {
      const product = productMap.get(productId);
      if (!product) return;
      if (product.stockLimit && product.stockLimit > 0) {
        const dailySales = product.dailySales ?? 0;
        const remaining = Math.max(product.stockLimit - dailySales, 0);
        if (remaining <= 0) {
          throw new Error(`${product.name}已售罄`);
        }
        if (dailySales + count > product.stockLimit) {
          throw new Error(`${product.name}库存不足，剩余${remaining}份`);
        }
      }
    });

  const now = new Date();
  const formattedDate = formatOrderDate(now);
  const defaultAddress = (await getDefaultAddress()) || DEFAULT_ADDRESS;

  const newOrders: Order[] = [];

  groups.forEach((group) => {
    let total = 0;
    let count = 0;

    const detailedItems: OrderItem[] = group.items.map((item) => {
      const unitPrice = calculateItemPrice(item.product, item.specs || []);
      const lineTotal = unitPrice * item.count;
      total += lineTotal;
      count += item.count;

        return {
          productId: item.product.id,
          name: item.product.name,
          count: item.count,
          price: lineTotal,
          specs: item.specs,
          imageUrl: item.product.imageUrl,
        };
      });

    const deliveryFee = mode === 'delivery' ? DELIVERY_FEE : 0;
    const orderId = `o_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const createdAt = now.toISOString();

      const order: Order = {
        id: orderId,
        vendorId: group.vendor.id,
        vendorName: group.vendor.name,
        vendorImage: group.vendor.imageUrl,
        vendorLocation: group.vendor.location,
        buyerId,
        status: 'pending-payment',
        orderType: mode,
        pickupCode: mode === 'dine-in' ? `A-${Math.floor(Math.random() * 900) + 100}` : undefined,
        itemsSummary: detailedItems.map((item) => `${item.name} x${item.count}`).join(', '),
        detailedItems,
        totalPrice: total + deliveryFee,
        date: formattedDate,
        count,
        createdAt,
        statusUpdatedAt: createdAt,
        remarks: remarks ? remarks[group.vendor.id] : undefined,
        address: mode === 'delivery' ? defaultAddress : undefined,
        deliveryTime: mode === 'delivery' ? deliveryTime || '尽快送达' : undefined,
        paymentMethod: paymentMethod || '微信支付',
        paymentStatus: 'unpaid',
        paidAt: undefined,
        completedAt: undefined,
        buyerPhone: buyerPhone || undefined,
        paymentProofs: [],
      };

    newOrders.push(order);
  });

    const insertOrder = `
      INSERT INTO orders (
        id, vendorId, vendorName, vendorImage, vendorLocation, buyerId, buyerPhone, status, cancelReason, orderType, pickupCode,
        itemsSummary, detailedItems, totalPrice, date, count, riderName, riderPhone, deliveryTime,
        remarks, paymentMethod, paymentStatus, paidAt, completedAt, statusUpdatedAt, paymentProofs, address, createdAt
      ) VALUES (
        :id, :vendorId, :vendorName, :vendorImage, :vendorLocation, :buyerId, :buyerPhone, :status, :cancelReason, :orderType, :pickupCode,
        :itemsSummary, :detailedItems, :totalPrice, :date, :count, :riderName, :riderPhone, :deliveryTime,
        :remarks, :paymentMethod, :paymentStatus, :paidAt, :completedAt, :statusUpdatedAt, :paymentProofs, :address, :createdAt
      )
    `;

  const updateSales = 'UPDATE products SET dailySales = dailySales + ? WHERE id = ?';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const order of newOrders) {
      const createdAt = order.createdAt || new Date().toISOString();
      const statusUpdatedAt = order.statusUpdatedAt || createdAt;
      await connection.execute(insertOrder, {
        id: order.id,
        vendorId: order.vendorId,
        vendorName: order.vendorName,
        vendorImage: order.vendorImage || '',
        vendorLocation: order.vendorLocation || null,
        buyerId: order.buyerId || null,
        buyerPhone: order.buyerPhone || null,
        status: order.status,
        cancelReason: order.cancelReason || null,
        orderType: order.orderType,
        pickupCode: order.pickupCode || null,
        itemsSummary: order.itemsSummary,
        detailedItems: order.detailedItems ? JSON.stringify(order.detailedItems) : null,
        totalPrice: order.totalPrice,
        date: order.date,
        count: order.count,
        riderName: order.riderName || null,
        riderPhone: order.riderPhone || null,
        deliveryTime: order.deliveryTime || null,
        remarks: order.remarks || null,
        paymentMethod: order.paymentMethod || null,
        paymentStatus: order.paymentStatus || null,
        paidAt: order.paidAt || null,
        completedAt: order.completedAt || null,
        statusUpdatedAt,
        paymentProofs: order.paymentProofs ? JSON.stringify(order.paymentProofs) : null,
        address: order.address ? JSON.stringify(order.address) : null,
        createdAt,
      });
    }

    for (const [productId, count] of productCounts.entries()) {
      await connection.execute(updateSales, [count, productId]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return newOrders;
};

export const updateOrderStatus = async (
  id: string,
  status: Order['status'],
  cancelReason?: string
): Promise<Order> => {
  const existing = await getOrderById(id);
  if (!existing) {
    throw new Error('Order not found');
  }

  const nextCancelReason = status === 'cancelled' ? cancelReason || existing.cancelReason || null : null;
  const now = new Date().toISOString();
  const statusUpdatedAt = now;
  let paidAt = existing.paidAt || null;
  let completedAt = existing.completedAt || null;
  let paymentStatus = existing.paymentStatus || null;
  const paidStatuses: Order['status'][] = [
    'pending-confirmation',
    'preparing',
    'ready',
    'delivering',
    'completed',
  ];

  if (paidStatuses.includes(status)) {
    if (!paidAt) {
      paidAt = now;
    }
    if (paymentStatus !== 'refunded' && paymentStatus !== 'partially_refunded') {
      paymentStatus = 'paid';
    }
  } else if (status === 'pending-payment' && !paymentStatus) {
    paymentStatus = 'unpaid';
  }

  if (status === 'completed' && !completedAt) {
    completedAt = now;
  }

  const shouldReleaseInventory =
    status === 'cancelled' &&
    existing.status !== 'cancelled' &&
    ['pending-payment', 'pending-confirmation'].includes(existing.status);
  const inventoryRelease = new Map<string, number>();
  if (shouldReleaseInventory && Array.isArray(existing.detailedItems)) {
    existing.detailedItems.forEach((item) => {
      if (!item.productId || !item.count) return;
      inventoryRelease.set(item.productId, (inventoryRelease.get(item.productId) || 0) + item.count);
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      'UPDATE orders SET status = ?, cancelReason = ?, paymentStatus = ?, paidAt = ?, completedAt = ?, statusUpdatedAt = ? WHERE id = ?',
      [status, nextCancelReason, paymentStatus, paidAt, completedAt, statusUpdatedAt, id]
    );
    if (inventoryRelease.size > 0) {
      for (const [productId, count] of inventoryRelease.entries()) {
        await connection.execute(
          'UPDATE products SET dailySales = GREATEST(dailySales - ?, 0) WHERE id = ?',
          [count, productId]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updated = await getOrderById(id);
  if (!updated) {
    throw new Error('Failed to update order');
  }
  return updated;
};

export const markOrderPaid = async (id: string, paidAtOverride?: string): Promise<Order> => {
  const existing = await getOrderById(id);
  if (!existing) {
    throw new Error('Order not found');
  }
  if (existing.status === 'cancelled') {
    throw new Error('Cancelled order cannot be marked as paid');
  }

  const paidAt = paidAtOverride || existing.paidAt || new Date().toISOString();
  const statusUpdatedAt = new Date().toISOString();
  const nextStatus = existing.status === 'pending-payment' ? 'pending-confirmation' : existing.status;
  const paymentStatus =
    existing.paymentStatus === 'refunded' || existing.paymentStatus === 'partially_refunded'
      ? existing.paymentStatus
      : 'paid';

  await execute<ResultSetHeader>(
    'UPDATE orders SET status = ?, paymentStatus = ?, paidAt = ?, statusUpdatedAt = ? WHERE id = ?',
    [nextStatus, paymentStatus, paidAt, statusUpdatedAt, id]
  );

  const updated = await getOrderById(id);
  if (!updated) {
    throw new Error('Failed to update order');
  }
  return updated;
};

export const appendOrderPaymentProof = async (
  id: string,
  proof: PaymentProof
): Promise<Order> => {
  const existing = await getOrderById(id);
  if (!existing) {
    throw new Error('Order not found');
  }

  const current = Array.isArray(existing.paymentProofs) ? existing.paymentProofs : [];
  const nextProofs = [...current, proof].slice(-MAX_PAYMENT_PROOFS);

  await execute<ResultSetHeader>('UPDATE orders SET paymentProofs = ? WHERE id = ?', [
    JSON.stringify(nextProofs),
    id,
  ]);

  const updated = await getOrderById(id);
  if (!updated) {
    throw new Error('Failed to update order');
  }
  return updated;
};



