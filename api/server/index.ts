import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import {
  createOrders,
  createProduct,
  createVendor,
  deleteVendor,
  deleteProduct,
  getDeliveryUrgeCounts,
  getAppConfig,
  getDefaultAddress,
  getOrders,
  getOrderById,
  getProductById,
  getProducts,
  getProductsByVendor,
  getVendorById,
  getVendors,
  initDb,
  loginAdmin,
  loginMerchant,
  markOrderPaid,
  appendOrderPaymentProof,
  incrementDeliveryUrgeCounts,
  updateAppConfig,
  updateOrderStatus,
  updateProduct,
  updateVendor,
} from './db';
import { AiService } from './ai-service';
import {
  deleteImageArrayIfManaged,
  deleteImageIfManaged,
  deleteUnreferencedImages,
  uploadImageArrayIfNeeded,
  uploadImageIfNeeded,
} from './oss';

const ROOT = process.cwd();
const envLocal = path.join(ROOT, '.env.local');
const envDefault = path.join(ROOT, '.env');

if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
}

const PORT = Number(process.env.API_PORT || 8787);

const aiService = new AiService({
  apiKey: process.env.GEMINI_API_KEY,
  getVendors,
  getProducts,
});

const parseJsonArray = (value: unknown): unknown[] | undefined => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed : undefined;
};

type SpecSelection = { option: string; label: string; priceDelta?: number };

const normalizeSpecsInput = (value: unknown): SpecSelection[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((spec) => {
      if (typeof spec === 'string') {
        return { option: 'spec', label: spec } as SpecSelection;
      }
      if (spec && typeof spec === 'object') {
        const option = typeof (spec as any).option === 'string' ? (spec as any).option : 'spec';
        const label = typeof (spec as any).label === 'string' ? (spec as any).label : '';
        const priceDelta = typeof (spec as any).priceDelta === 'number' ? (spec as any).priceDelta : undefined;
        return label ? { option, label, priceDelta } as SpecSelection : null;
      }
      return null;
    })
    .filter(Boolean) as SpecSelection[];
};
const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
};

const isStringTooLong = (value: unknown, maxLength: number): boolean =>
  typeof value === 'string' && value.trim().length > maxLength;

const normalizePhone = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '').trim();
};

const ensureMaxLength = (
  res: express.Response,
  value: unknown,
  maxLength: number,
  field: string
): boolean => {
  if (!isStringTooLong(value, maxLength)) return true;
  res.status(400).json({ error: `${field} is too long` });
  return false;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const getClientId = (req: express.Request): string => {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded && typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
};

const checkRateLimit = (
  req: express.Request,
  res: express.Response,
  options: { key: string; limit: number; windowMs: number; identity?: string }
): boolean => {
  const identity = options.identity || getClientId(req);
  const now = Date.now();
  const bucketKey = `${options.key}:${identity}`;
  const bucket = rateLimitStore.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    rateLimitStore.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (bucket.count >= options.limit) {
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }

  bucket.count += 1;
  return true;
};

const isProd = process.env.NODE_ENV === 'production';
const requireEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value && value.trim()) return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required env: ${key}`);
};

const AUTH_SECRET = requireEnv('AUTH_SECRET', isProd ? undefined : 'dev_auth_secret');
const ADMIN_TOKEN = requireEnv('ADMIN_TOKEN', isProd ? undefined : 'dev_admin_token');
const MERCHANT_TOKEN_TTL_MS = Number(process.env.MERCHANT_TOKEN_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const ADMIN_TOKEN_TTL_MS = Number(process.env.ADMIN_TOKEN_TTL_MS || 1000 * 60 * 60 * 12);

type AuthContext =
  | { role: 'admin'; username?: string }
  | { role: 'merchant'; vendorId: string }
  | { role: 'guest' };

type AuthTokenPayload =
  | {
      role: 'merchant';
      vendorId: string;
      exp: number;
    }
  | {
      role: 'admin';
      username: string;
      exp: number;
    };

const base64UrlEncode = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const base64UrlDecode = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64').toString('utf-8');
};

const signToken = (payload: AuthTokenPayload): string => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', AUTH_SECRET).update(unsigned).digest()
  );
  return `${unsigned}.${signature}`;
};

const verifyToken = (token: string): AuthTokenPayload | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = base64UrlEncode(
    crypto.createHmac('sha256', AUTH_SECRET).update(unsigned).digest()
  );
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as AuthTokenPayload;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.role === 'merchant') {
      if (!payload.vendorId) return null;
    } else if (payload.role === 'admin') {
      if (!payload.username) return null;
    } else {
      return null;
    }
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const getBearerToken = (req: express.Request): string | null => {
  const header = req.header('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
};

const getAuthContext = (req: express.Request): AuthContext => {
  const adminHeader = req.header('x-admin-token');
  const bearer = getBearerToken(req);
  if (adminHeader) {
    if (adminHeader === ADMIN_TOKEN) {
      return { role: 'admin' };
    }
    const adminPayload = verifyToken(adminHeader);
    if (adminPayload?.role === 'admin') {
      return { role: 'admin', username: adminPayload.username };
    }
  }
  if (bearer) {
    if (bearer === ADMIN_TOKEN) {
      return { role: 'admin' };
    }
    const payload = verifyToken(bearer);
    if (payload?.role === 'merchant') {
      return { role: 'merchant', vendorId: payload.vendorId };
    }
    if (payload?.role === 'admin') {
      return { role: 'admin', username: payload.username };
    }
  }
  return { role: 'guest' };
};

const ensureAdmin = (req: express.Request, res: express.Response): AuthContext | null => {
  const auth = getAuthContext(req);
  if (auth.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required' });
    return null;
  }
  return auth;
};

const stripVendorSecrets = <T extends { password?: string }>(vendor: T): Omit<T, 'password'> => {
  const { password: _password, ...rest } = vendor;
  return rest;
};

const app = express();
const corsOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const requestOrigin = req.header('origin');
  if (corsOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && corsOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Buyer-Id, X-Admin-Token');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', async (_req, res) => {
  res.json({ defaultAddress: (await getDefaultAddress()) || undefined });
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!checkRateLimit(req, res, { key: 'admin-login', limit: 8, windowMs: 60_000 })) return;
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  if (!ensureMaxLength(res, username, 64, 'Username')) return;
  if (!ensureMaxLength(res, password, 64, 'Password')) return;
  try {
    const admin = await loginAdmin(username.trim(), password.trim());
    const token = signToken({
      role: 'admin',
      username: admin.username,
      exp: Date.now() + ADMIN_TOKEN_TTL_MS,
    });
    res.json({ admin: { username: admin.username }, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

app.post('/api/merchant/login', async (req, res) => {
  const { code, password } = req.body || {};
  if (!checkRateLimit(req, res, { key: 'merchant-login', limit: 10, windowMs: 60_000 })) return;
  if (typeof code !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Code and password are required' });
    return;
  }
  if (!ensureMaxLength(res, code, 32, 'Code')) return;
  if (!ensureMaxLength(res, password, 64, 'Password')) return;
  try {
    const vendor = await loginMerchant(code.trim(), password.trim());
    const token = signToken({
      role: 'merchant',
      vendorId: vendor.id,
      exp: Date.now() + MERCHANT_TOKEN_TTL_MS,
    });
    res.json({ vendor: stripVendorSecrets(vendor), token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

app.get('/api/app-config', async (_req, res) => {
  res.json(await getAppConfig());
});

app.put('/api/app-config', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const payload = req.body || {};
  const nextConfig = await updateAppConfig(payload);
  res.json(nextConfig);
});

app.get('/api/delivery-urges', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  res.json({ counts: await getDeliveryUrgeCounts() });
});

app.post('/api/delivery-urges', async (req, res) => {
  const buyerId = req.header('x-buyer-id') || undefined;
  if (!buyerId) {
    res.status(401).json({ error: 'Buyer authorization required' });
    return;
  }
  if (!checkRateLimit(req, res, { key: 'delivery-urge', limit: 30, windowMs: 60_000, identity: buyerId })) return;
  const payload = req.body || {};
  const vendorIds: string[] = Array.isArray(payload.vendorIds)
    ? payload.vendorIds.filter((id: unknown) => typeof id === 'string').map((id: string) => id.trim())
    : typeof payload.vendorId === 'string'
      ? [payload.vendorId.trim()]
      : [];
  const normalized = Array.from(new Set(vendorIds.filter(Boolean)));
  if (normalized.length === 0) {
    res.status(400).json({ error: 'Vendor id is required' });
    return;
  }
  if (normalized.length > 10 || normalized.some((id) => id.length > 64)) {
    res.status(400).json({ error: 'Invalid vendor id' });
    return;
  }
  const counts = await incrementDeliveryUrgeCounts(normalized);
  res.json({ ok: true, counts });
});

app.get('/api/vendors', async (_req, res) => {
  const auth = getAuthContext(_req);
  if (auth.role === 'admin') {
    const vendors = await getVendors();
    res.json(vendors.map((vendor) => stripVendorSecrets(vendor)));
    return;
  }
  if (auth.role === 'merchant') {
    const vendor = await getVendorById(auth.vendorId);
    res.json(vendor ? [stripVendorSecrets(vendor)] : []);
    return;
  }
  const vendors = await getVendors();
  res.json(vendors.map((vendor) => stripVendorSecrets(vendor)));
});

app.post('/api/vendors', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
    try {
      const payload = req.body || {};
      const qualificationsRaw = parseJsonArray(payload.qualifications);
      const menuCategories = parseJsonArray(payload.menuCategories);
      if (!ensureMaxLength(res, payload.code, 32, 'Code')) return;
      if (!ensureMaxLength(res, payload.password, 64, 'Password')) return;
      if (!ensureMaxLength(res, payload.name, 80, 'Name')) return;
      if (!ensureMaxLength(res, payload.category, 40, 'Category')) return;
      if (!ensureMaxLength(res, payload.location, 120, 'Location')) return;
      if (!ensureMaxLength(res, payload.locationShort, 60, 'Short location')) return;
      if (!ensureMaxLength(res, payload.description, 400, 'Description')) return;
      if (!ensureMaxLength(res, payload.businessHours, 64, 'Business hours')) return;
      if (!ensureMaxLength(res, payload.phone, 32, 'Phone')) return;
      if (!ensureMaxLength(res, payload.ownerName, 40, 'Owner name')) return;
      if (menuCategories && menuCategories.length > 20) {
        res.status(400).json({ error: 'Too many menu categories' });
        return;
      }
      if (menuCategories && menuCategories.some((item) => isStringTooLong(item, 20))) {
        res.status(400).json({ error: 'Menu category is too long' });
        return;
      }
        const vendorKey =
          typeof payload.id === 'string'
            ? payload.id
            : typeof payload.code === 'string'
              ? payload.code
              : 'vendors';
        const vendorPrefix = `vendors/${vendorKey}`;
        const qualifications = qualificationsRaw
          ? await uploadImageArrayIfNeeded(qualificationsRaw.map(String), `${vendorPrefix}/qualifications`)
          : undefined;
        const imageUrl =
          typeof payload.imageUrl === 'string'
            ? await uploadImageIfNeeded(payload.imageUrl, vendorPrefix)
            : undefined;
        const paymentWechatQr =
          typeof payload.paymentWechatQr === 'string'
            ? await uploadImageIfNeeded(payload.paymentWechatQr, `${vendorPrefix}/payments`)
            : undefined;
        const paymentAlipayQr =
          typeof payload.paymentAlipayQr === 'string'
            ? await uploadImageIfNeeded(payload.paymentAlipayQr, `${vendorPrefix}/payments`)
            : undefined;
        const qualificationImage =
          typeof payload.qualificationImage === 'string'
            ? await uploadImageIfNeeded(payload.qualificationImage, `${vendorPrefix}/qualifications`)
            : undefined;
        const signImage =
          typeof payload.signImage === 'string'
            ? await uploadImageIfNeeded(payload.signImage, `${vendorPrefix}/signs`)
            : undefined;
      const vendor = await createVendor({
        id: typeof payload.id === 'string' ? payload.id : undefined,
        code: typeof payload.code === 'string' ? payload.code : undefined,
        password: typeof payload.password === 'string' ? payload.password : undefined,
        name: String(payload.name || ''),
        category: String(payload.category || ''),
        status: typeof payload.status === 'string' ? payload.status : undefined,
        rating: payload.rating,
        imageUrl,
        location: String(payload.location || ''),
        locationShort: typeof payload.locationShort === 'string' ? payload.locationShort : undefined,
        lastVisited: typeof payload.lastVisited === 'string' ? payload.lastVisited : undefined,
        menuCategories: menuCategories ? menuCategories.map(String) : undefined,
        description: typeof payload.description === 'string' ? payload.description : undefined,
        businessHours: typeof payload.businessHours === 'string' ? payload.businessHours : undefined,
        phone: typeof payload.phone === 'string' ? payload.phone : undefined,
        paymentWechatQr,
        paymentAlipayQr,
        qualifications,
        qualificationImage,
        qualificationUploadedAt:
          typeof payload.qualificationUploadedAt === 'string' ? payload.qualificationUploadedAt : undefined,
        signImage,
        signUploadedAt:
          typeof payload.signUploadedAt === 'string' ? payload.signUploadedAt : undefined,
        ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : undefined,
      });
    res.status(201).json(stripVendorSecrets(vendor));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create vendor';
    res.status(400).json({ error: message });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  const auth = getAuthContext(req);
  if (auth.role === 'merchant' && auth.vendorId !== req.params.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const vendor = await getVendorById(req.params.id);
  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }
  res.json(stripVendorSecrets(vendor));
});

app.get('/api/vendors/:id/qrcode', async (req, res) => {
  const auth = getAuthContext(req);
  if (auth.role === 'merchant' && auth.vendorId !== req.params.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (auth.role === 'guest') {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }
  const vendor = await getVendorById(req.params.id);
  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }
  const code = vendor.code?.trim();
  if (!code) {
    res.status(400).json({ error: 'Vendor code missing' });
    return;
  }
  const baseUrlRaw =
    (typeof req.query.baseUrl === 'string' && req.query.baseUrl.trim()) ||
    process.env.CLIENT_BASE_URL ||
    process.env.CUSTOMER_APP_URL ||
    '';
  if (!baseUrlRaw) {
    res.status(400).json({ error: 'Base URL is required' });
    return;
  }
  let baseUrl = baseUrlRaw.trim();
  try {
    // Validate URL format
    new URL(baseUrl);
  } catch {
    res.status(400).json({ error: 'Invalid base URL' });
    return;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  const targetUrl = `${baseUrl}/?code=${encodeURIComponent(code)}`;
  const size =
    typeof req.query.size === 'string' ? Number(req.query.size) : 320;
  const width = Number.isFinite(size) && size > 100 ? size : 320;
  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    res.json({ vendorId: vendor.id, code, url: targetUrl, qrDataUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'QR generation failed';
    res.status(500).json({ error: message });
  }
});

app.put('/api/vendors/:id', async (req, res) => {
  const auth = getAuthContext(req);
  const isAdmin = auth.role === 'admin';
  const isOwner = auth.role === 'merchant' && auth.vendorId === req.params.id;
  if (!isAdmin && !isOwner) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
    try {
      const payload = req.body || {};
      const existingVendor = await getVendorById(req.params.id);
      if (!existingVendor) {
        res.status(404).json({ error: 'Vendor not found' });
        return;
      }
      const qualificationsRaw = parseJsonArray(payload.qualifications);
      const menuCategories = parseJsonArray(payload.menuCategories);
      if (!ensureMaxLength(res, payload.code, 32, 'Code')) return;
      if (!ensureMaxLength(res, payload.name, 80, 'Name')) return;
      if (!ensureMaxLength(res, payload.category, 40, 'Category')) return;
      if (!ensureMaxLength(res, payload.location, 120, 'Location')) return;
      if (!ensureMaxLength(res, payload.locationShort, 60, 'Short location')) return;
      if (!ensureMaxLength(res, payload.description, 400, 'Description')) return;
      if (!ensureMaxLength(res, payload.businessHours, 64, 'Business hours')) return;
      if (!ensureMaxLength(res, payload.phone, 32, 'Phone')) return;
      if (!ensureMaxLength(res, payload.ownerName, 40, 'Owner name')) return;
      if (menuCategories && menuCategories.length > 20) {
        res.status(400).json({ error: 'Too many menu categories' });
        return;
      }
      if (menuCategories && menuCategories.some((item) => isStringTooLong(item, 20))) {
        res.status(400).json({ error: 'Menu category is too long' });
        return;
      }
      const vendorPrefix = `vendors/${req.params.id}`;
      const hasImageUrlField = Object.prototype.hasOwnProperty.call(payload, 'imageUrl');
      const hasPaymentWechatField = Object.prototype.hasOwnProperty.call(payload, 'paymentWechatQr');
      const hasPaymentAlipayField = Object.prototype.hasOwnProperty.call(payload, 'paymentAlipayQr');
      const hasQualificationsField = Object.prototype.hasOwnProperty.call(payload, 'qualifications');
      const hasQualificationImageField = Object.prototype.hasOwnProperty.call(payload, 'qualificationImage');
      const hasSignImageField = Object.prototype.hasOwnProperty.call(payload, 'signImage');

      const qualifications = hasQualificationsField
        ? await uploadImageArrayIfNeeded(qualificationsRaw?.map(String) ?? [], `${vendorPrefix}/qualifications`)
        : undefined;
      const imageUrl = hasImageUrlField
        ? await uploadImageIfNeeded(
            typeof payload.imageUrl === 'string' ? payload.imageUrl : '',
            vendorPrefix
          )
        : undefined;
      const paymentWechatQr = hasPaymentWechatField
        ? await uploadImageIfNeeded(
            typeof payload.paymentWechatQr === 'string' ? payload.paymentWechatQr : '',
            `${vendorPrefix}/payments`
          )
        : undefined;
      const paymentAlipayQr = hasPaymentAlipayField
        ? await uploadImageIfNeeded(
            typeof payload.paymentAlipayQr === 'string' ? payload.paymentAlipayQr : '',
            `${vendorPrefix}/payments`
          )
        : undefined;
      const qualificationImage = hasQualificationImageField
        ? await uploadImageIfNeeded(
            typeof payload.qualificationImage === 'string' ? payload.qualificationImage : '',
            `${vendorPrefix}/qualifications`
          )
        : undefined;
      const signImage = hasSignImageField
        ? await uploadImageIfNeeded(
            typeof payload.signImage === 'string' ? payload.signImage : '',
            `${vendorPrefix}/signs`
          )
        : undefined;
      const baseUpdates = {
        code: typeof payload.code === 'string' ? payload.code : undefined,
        name: typeof payload.name === 'string' ? payload.name : undefined,
        category: typeof payload.category === 'string' ? payload.category : undefined,
        status: typeof payload.status === 'string' ? payload.status : undefined,
        isOpen: toBoolean(payload.isOpen),
        rating: payload.rating,
        imageUrl,
        location: typeof payload.location === 'string' ? payload.location : undefined,
        locationShort: typeof payload.locationShort === 'string' ? payload.locationShort : undefined,
        lastVisited: typeof payload.lastVisited === 'string' ? payload.lastVisited : undefined,
        menuCategories: menuCategories ? menuCategories.map(String) : undefined,
        description: typeof payload.description === 'string' ? payload.description : undefined,
        businessHours: typeof payload.businessHours === 'string' ? payload.businessHours : undefined,
        phone: typeof payload.phone === 'string' ? payload.phone : undefined,
        paymentWechatQr,
        paymentAlipayQr,
        qualifications,
        qualificationImage,
        qualificationUploadedAt:
          typeof payload.qualificationUploadedAt === 'string' ? payload.qualificationUploadedAt : undefined,
        signImage,
        signUploadedAt:
          typeof payload.signUploadedAt === 'string' ? payload.signUploadedAt : undefined,
        ownerName: typeof payload.ownerName === 'string' ? payload.ownerName : undefined,
        revenue: payload.revenue,
    };
    const vendorUpdates = isAdmin
      ? baseUpdates
      : {
          name: baseUpdates.name,
          category: baseUpdates.category,
          isOpen: baseUpdates.isOpen,
          imageUrl: baseUpdates.imageUrl,
          location: baseUpdates.location,
          locationShort: baseUpdates.locationShort,
          menuCategories: baseUpdates.menuCategories,
          description: baseUpdates.description,
          businessHours: baseUpdates.businessHours,
          phone: baseUpdates.phone,
          paymentWechatQr: baseUpdates.paymentWechatQr,
          paymentAlipayQr: baseUpdates.paymentAlipayQr,
          qualifications: baseUpdates.qualifications,
          qualificationImage: baseUpdates.qualificationImage,
          qualificationUploadedAt: baseUpdates.qualificationUploadedAt,
          signImage: baseUpdates.signImage,
          signUploadedAt: baseUpdates.signUploadedAt,
        };
      const vendor = await updateVendor(req.params.id, vendorUpdates);
      if (hasImageUrlField && existingVendor.imageUrl && existingVendor.imageUrl !== vendor.imageUrl) {
        await deleteImageIfManaged(existingVendor.imageUrl);
      }
      if (
        hasPaymentWechatField &&
        existingVendor.paymentWechatQr &&
        existingVendor.paymentWechatQr !== vendor.paymentWechatQr
      ) {
        await deleteImageIfManaged(existingVendor.paymentWechatQr);
      }
      if (
        hasPaymentAlipayField &&
        existingVendor.paymentAlipayQr &&
        existingVendor.paymentAlipayQr !== vendor.paymentAlipayQr
      ) {
        await deleteImageIfManaged(existingVendor.paymentAlipayQr);
      }
      if (
        hasQualificationImageField &&
        existingVendor.qualificationImage &&
        existingVendor.qualificationImage !== vendor.qualificationImage
      ) {
        await deleteImageIfManaged(existingVendor.qualificationImage);
      }
      if (hasSignImageField && existingVendor.signImage && existingVendor.signImage !== vendor.signImage) {
        await deleteImageIfManaged(existingVendor.signImage);
      }
      if (hasQualificationsField) {
        await deleteUnreferencedImages(existingVendor.qualifications, vendor.qualifications);
      }
      res.json(stripVendorSecrets(vendor));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update vendor';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const existing = await getVendorById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    await deleteVendor(req.params.id);
    await deleteImageIfManaged(existing.imageUrl);
    await deleteImageIfManaged(existing.paymentWechatQr);
    await deleteImageIfManaged(existing.paymentAlipayQr);
    await deleteImageIfManaged(existing.qualificationImage);
    await deleteImageIfManaged(existing.signImage);
    await deleteImageArrayIfManaged(existing.qualifications);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete vendor';
    res.status(400).json({ error: message });
  }
});

app.get('/api/vendors/:id/products', async (req, res) => {
  const vendor = await getVendorById(req.params.id);
  if (!vendor) {
    res.status(404).json({ error: 'Vendor not found' });
    return;
  }
  res.json(await getProductsByVendor(vendor.id));
});

app.get('/api/products', async (_req, res) => {
  const auth = getAuthContext(_req);
  if (auth.role === 'merchant') {
    res.json(await getProductsByVendor(auth.vendorId));
    return;
  }
  res.json(await getProducts());
});

app.post('/api/products', async (req, res) => {
  const auth = getAuthContext(req);
  const isAdmin = auth.role === 'admin';
  const isMerchant = auth.role === 'merchant';
  if (!isAdmin && !isMerchant) {
    res.status(403).json({ error: 'Authorization required' });
    return;
  }
  try {
      const payload = req.body || {};
      let options = payload.options;
    if (typeof options === 'string') {
      options = options.trim().length ? JSON.parse(options) : undefined;
    }
      if (options !== undefined && !Array.isArray(options)) {
        res.status(400).json({ error: 'Options must be an array' });
        return;
      }
      if (!ensureMaxLength(res, payload.name, 80, 'Product name')) return;
      if (!ensureMaxLength(res, payload.description, 400, 'Product description')) return;
      if (!ensureMaxLength(res, payload.category, 40, 'Product category')) return;
      if (Array.isArray(options) && options.length > 20) {
        res.status(400).json({ error: 'Too many product options' });
        return;
      }
      const stockLimit = payload.stockLimit === undefined ? undefined : Number(payload.stockLimit);
      const dailySales = payload.dailySales === undefined ? undefined : Number(payload.dailySales);
      const imageUrlsRaw = parseJsonArray(payload.imageUrls);

    const vendorId = isMerchant ? auth.vendorId : String(payload.vendorId || '');
    if (!vendorId) {
      res.status(400).json({ error: 'Vendor id is required' });
      return;
    }
      const productPrefix = `products/${vendorId}`;
      const imageUrls = imageUrlsRaw
        ? await uploadImageArrayIfNeeded(imageUrlsRaw.map(String), productPrefix)
        : undefined;
      const imageUrlInput =
        typeof payload.imageUrl === 'string'
          ? await uploadImageIfNeeded(payload.imageUrl, productPrefix)
          : undefined;
      const imageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : imageUrlInput;
      const product = await createProduct({
        id: typeof payload.id === 'string' ? payload.id : undefined,
        vendorId,
        name: String(payload.name || ''),
        description: String(payload.description || ''),
        price: payload.price,
        imageUrl,
        imageUrls,
        category: String(payload.category || ''),
        isSpicy: toBoolean(payload.isSpicy),
        isHot: toBoolean(payload.isHot),
      options: options,
      status: typeof payload.status === 'string' ? payload.status : undefined,
      stockLimit: Number.isFinite(stockLimit) ? stockLimit : undefined,
      dailySales: Number.isFinite(dailySales) ? dailySales : undefined,
    });
    res.status(201).json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    res.status(400).json({ error: message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const auth = getAuthContext(req);
  const isAdmin = auth.role === 'admin';
  const isMerchant = auth.role === 'merchant';
  if (!isAdmin && !isMerchant) {
    res.status(403).json({ error: 'Authorization required' });
    return;
  }
  try {
    const payload = req.body || {};
    let options = payload.options;
    if (typeof options === 'string') {
      options = options.trim().length ? JSON.parse(options) : undefined;
    }
      if (options !== undefined && !Array.isArray(options)) {
        res.status(400).json({ error: 'Options must be an array' });
        return;
      }
      if (!ensureMaxLength(res, payload.name, 80, 'Product name')) return;
      if (!ensureMaxLength(res, payload.description, 400, 'Product description')) return;
      if (!ensureMaxLength(res, payload.category, 40, 'Product category')) return;
      if (Array.isArray(options) && options.length > 20) {
        res.status(400).json({ error: 'Too many product options' });
        return;
      }
        const stockLimit = payload.stockLimit === undefined ? undefined : Number(payload.stockLimit);
        const dailySales = payload.dailySales === undefined ? undefined : Number(payload.dailySales);
        const imageUrlsRaw = parseJsonArray(payload.imageUrls);
        const hasImageUrlsField = Object.prototype.hasOwnProperty.call(payload, 'imageUrls');
        const hasImageUrlField = Object.prototype.hasOwnProperty.call(payload, 'imageUrl');
  
        const existing = await getProductById(req.params.id);
        if (!existing) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }
        if (isMerchant && existing.vendorId !== auth.vendorId) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
        const productPrefix = `products/${existing.vendorId}`;
        const imageUrls = hasImageUrlsField
          ? await uploadImageArrayIfNeeded(imageUrlsRaw?.map(String) ?? [], productPrefix)
          : undefined;
        const imageUrlInput = hasImageUrlField
          ? await uploadImageIfNeeded(
              typeof payload.imageUrl === 'string' ? payload.imageUrl : '',
              productPrefix
            )
          : undefined;
        const imageUrl =
          hasImageUrlsField
            ? imageUrls && imageUrls.length > 0
              ? imageUrls[0]
              : imageUrlInput
            : imageUrlInput;
        const product = await updateProduct(req.params.id, {
          vendorId:
            isAdmin && typeof payload.vendorId === 'string'
              ? payload.vendorId
              : undefined,
          name: typeof payload.name === 'string' ? payload.name : undefined,
          description: typeof payload.description === 'string' ? payload.description : undefined,
          price: payload.price,
          imageUrl: hasImageUrlField || hasImageUrlsField ? imageUrl : undefined,
          imageUrls: hasImageUrlsField ? imageUrls : undefined,
          category: typeof payload.category === 'string' ? payload.category : undefined,
          isSpicy: toBoolean(payload.isSpicy),
          isHot: toBoolean(payload.isHot),
          options: options,
          status: typeof payload.status === 'string' ? payload.status : undefined,
          stockLimit: Number.isFinite(stockLimit) ? stockLimit : undefined,
          dailySales: Number.isFinite(dailySales) ? dailySales : undefined,
        });
        if (hasImageUrlField && existing.imageUrl && existing.imageUrl !== product.imageUrl) {
          await deleteImageIfManaged(existing.imageUrl);
        }
        if (hasImageUrlsField) {
          await deleteUnreferencedImages(existing.imageUrls, product.imageUrls);
          if (
            existing.imageUrl &&
            !(existing.imageUrls || []).includes(existing.imageUrl) &&
            existing.imageUrl !== product.imageUrl
          ) {
            await deleteImageIfManaged(existing.imageUrl);
          }
        }
      res.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    res.status(400).json({ error: message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const auth = getAuthContext(req);
  const isAdmin = auth.role === 'admin';
  const isMerchant = auth.role === 'merchant';
  if (!isAdmin && !isMerchant) {
    res.status(403).json({ error: 'Authorization required' });
    return;
  }
    const existing = await getProductById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    if (isMerchant && existing.vendorId !== auth.vendorId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await deleteProduct(req.params.id);
    await deleteImageArrayIfManaged(existing.imageUrls);
    if (
      existing.imageUrl &&
      !(existing.imageUrls || []).includes(existing.imageUrl)
    ) {
      await deleteImageIfManaged(existing.imageUrl);
    }
    res.status(204).end();
  });

app.get('/api/orders', async (req, res) => {
  const auth = getAuthContext(req);
  const buyerId =
    typeof req.query?.buyerId === 'string' ? req.query.buyerId : req.header('x-buyer-id');
  const buyerPhoneRaw = typeof req.query?.buyerPhone === 'string' ? req.query.buyerPhone : undefined;
  const buyerPhone = buyerPhoneRaw ? normalizePhone(buyerPhoneRaw) : undefined;
  if (buyerPhoneRaw && !buyerPhone) {
    res.status(400).json({ error: 'Invalid buyer phone' });
    return;
  }
  if (buyerPhone && buyerPhone.length > 20) {
    res.status(400).json({ error: 'Buyer phone is too long' });
    return;
  }

  if (auth.role === 'admin') {
      res.json(
      await getOrders({
        buyerId: buyerId || undefined,
        buyerPhone: buyerPhone ? buyerPhone.trim() : undefined,
      })
    );
    return;
  }

  if (auth.role === 'merchant') {
    res.json(await getOrders({ vendorId: auth.vendorId }));
    return;
  }

  if (!buyerId) {
    res.status(401).json({ error: 'Buyer authorization required' });
    return;
  }
  res.json(
    await getOrders({
      buyerId: buyerId || undefined,
    })
  );
});

app.post('/api/orders', async (req, res) => {
  const { items, mode, remarks, deliveryTime, paymentMethod, buyerPhone } = req.body || {};
  const buyerId = req.header('x-buyer-id') || undefined;

  if (!buyerId) {
    res.status(401).json({ error: 'Buyer authorization required' });
    return;
  }
  if (!checkRateLimit(req, res, { key: 'orders:create', limit: 20, windowMs: 60_000, identity: buyerId || getClientId(req) })) return;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Items are required' });
    return;
  }
  if (items.length > 50) {
    res.status(400).json({ error: 'Too many items' });
    return;
  }

  if (mode !== 'delivery' && mode !== 'dine-in') {
    res.status(400).json({ error: 'Invalid order mode' });
    return;
  }

  const normalizedPhone = normalizePhone(buyerPhone);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Buyer phone is required' });
    return;
  }
  if (normalizedPhone.length < 4 || normalizedPhone.length > 20) {
    res.status(400).json({ error: 'Buyer phone is invalid' });
    return;
  }
  if (!ensureMaxLength(res, deliveryTime, 64, 'Delivery time')) return;
  if (!ensureMaxLength(res, paymentMethod, 32, 'Payment method')) return;
  if (remarks && typeof remarks === 'object') {
    const remarkEntries = Object.values(remarks as Record<string, unknown>);
    if (remarkEntries.some((value) => isStringTooLong(value, 200))) {
      res.status(400).json({ error: 'Order remarks are too long' });
      return;
    }
  }

  const normalizedItems = items
    .map((item) => ({
      productId: String(item.productId || '').trim(),
      count: Number(item.count || 0),
      specs: normalizeSpecsInput(item.specs),
    }))
    .filter((item) => item.productId && item.productId.length <= 64 && item.count > 0 && item.count <= 99);

  if (normalizedItems.length === 0) {
    res.status(400).json({ error: 'No valid items' });
    return;
  }

  try {
    const orders = await createOrders({
      items: normalizedItems,
      mode,
      remarks: remarks && typeof remarks === 'object' ? remarks : undefined,
      deliveryTime: typeof deliveryTime === 'string' ? deliveryTime : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
      buyerId,
      buyerPhone: normalizedPhone,
    });
    res.status(201).json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    res.status(400).json({ error: message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const auth = getAuthContext(req);
  const isAdmin = auth.role === 'admin';
  const isMerchant = auth.role === 'merchant';
  const status = typeof req.body?.status === 'string' ? req.body.status : '';
  const cancelReason = typeof req.body?.cancelReason === 'string' ? req.body.cancelReason : undefined;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

    try {
      if (!isAdmin && !isMerchant) {
        const buyerId = req.header('x-buyer-id') || '';
        if (!buyerId) {
          res.status(403).json({ error: 'Authorization required' });
          return;
        }
        const order = await getOrderById(req.params.id);
        if (!order) {
          res.status(404).json({ error: 'Order not found' });
          return;
        }
        if (order.buyerId !== buyerId) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
        if (status === 'pending-confirmation') {
          if (order.status !== 'pending-payment') {
            res.status(409).json({ error: 'Order cannot be confirmed for payment' });
            return;
          }
        } else if (status === 'cancelled') {
          if (!['pending-payment', 'pending-confirmation'].includes(order.status)) {
            res.status(409).json({ error: 'Order cannot be cancelled' });
            return;
          }
        } else {
          res.status(403).json({ error: 'Buyer can only confirm or cancel orders' });
          return;
        }
      }
    if (isMerchant) {
      const order = await getOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      if (order.vendorId !== auth.vendorId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }
    const order = await updateOrderStatus(req.params.id, status as any, cancelReason);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    res.status(400).json({ error: message });
  }
});

app.post('/api/orders/:id/payment-callback', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const paidAt = typeof req.body?.paidAt === 'string' ? req.body.paidAt : undefined;

  try {
    const order = await markOrderPaid(req.params.id, paidAt);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update payment';
    res.status(400).json({ error: message });
  }
});

app.post('/api/orders/:id/payment-proof', async (req, res) => {
  const auth = getAuthContext(req);
  const buyerId = req.header('x-buyer-id') || '';
  const image = typeof req.body?.image === 'string' ? req.body.image.trim() : '';
  if (!checkRateLimit(req, res, { key: 'orders:payment-proof', limit: 10, windowMs: 10 * 60_000, identity: buyerId || getClientId(req) })) return;

  if (!image) {
    res.status(400).json({ error: 'Payment proof image is required' });
    return;
  }

  const sizeBytes = Buffer.byteLength(image, 'utf8');
  if (sizeBytes > 8 * 1024 * 1024) {
    res.status(413).json({ error: 'Payment proof image is too large' });
    return;
  }

  if (!image.startsWith('data:image/') && !/^https?:\/\//i.test(image)) {
    res.status(400).json({ error: 'Invalid payment proof image' });
    return;
  }

  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (auth.role === 'merchant' && order.vendorId !== auth.vendorId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (auth.role === 'guest') {
      if (!buyerId) {
        res.status(403).json({ error: 'Authorization required' });
        return;
      }
      if (order.buyerId !== buyerId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

      const proofPrefix = `orders/${order.vendorId}/${order.id}`;
      const updated = await appendOrderPaymentProof(order.id, {
        url: await uploadImageIfNeeded(image, proofPrefix),
        uploadedAt: new Date().toISOString(),
      });
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload payment proof';
    res.status(400).json({ error: message });
  }
});

app.post('/api/ai/recommendation', async (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query : '';
  if (!checkRateLimit(req, res, { key: 'ai:recommendation', limit: 10, windowMs: 60_000 })) return;
  if (!query.trim()) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }
  if (query.trim().length > 200) {
    res.status(400).json({ error: 'Query is too long' });
    return;
  }

  try {
    const reply = await aiService.getBeachRecommendation(query);
    res.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI service error';
    res.status(500).json({ error: message });
  }
});

app.get('/api/ai/daily-breeze', async (_req, res) => {
  if (!checkRateLimit(_req, res, { key: 'ai:daily-breeze', limit: 30, windowMs: 60_000 })) return;
  try {
    const tip = await aiService.generateDailyBreeze();
    res.json({ tip });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI service error';
    res.status(500).json({ error: message });
  }
});

const startServer = async () => {
  await initDb();
  app.listen(PORT, process.env.API_HOST || '127.0.0.1', () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to initialize database', error);
  process.exit(1);
});
