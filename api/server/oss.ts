import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const bucket = process.env.RAINYUN_BUCKET;
const endpoint = process.env.RAINYUN_ENDPOINT;
const accessKeyId = process.env.RAINYUN_ACCESS_KEY;
const secretAccessKey = process.env.RAINYUN_SECRET_KEY;
const publicBase = process.env.RAINYUN_PUBLIC_BASE;
const region = process.env.RAINYUN_REGION || 'auto';

let cachedClient: S3Client | null = null;

const ensureConfig = () => {
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicBase) {
    throw new Error('OSS config missing. Please set RAINYUN_BUCKET/ENDPOINT/ACCESS_KEY/SECRET_KEY/PUBLIC_BASE.');
  }
};

const getClient = () => {
  if (!cachedClient) {
    ensureConfig();
    cachedClient = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string },
    });
  }
  return cachedClient;
};

const normalizePublicBase = () => {
  ensureConfig();
  return (publicBase as string).replace(/\/+$/, '');
};

const getExtensionForMime = (mime: string) => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
};

const parseImageDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

const getObjectKeyFromUrl = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:image/')) return null;
  try {
    const parsed = new URL(trimmed);
    if (bucket && parsed.hostname.startsWith(`${bucket}.`)) {
      const key = parsed.pathname.replace(/^\/+/, '');
      return key || null;
    }
    if (bucket) {
      const path = parsed.pathname.replace(/^\/+/, '');
      if (path.startsWith(`${bucket}/`)) {
        const key = path.slice(bucket.length + 1);
        return key || null;
      }
    }
  } catch {
    // fallback to base matching
  }
  const baseCandidates = new Set<string>();
  try {
    baseCandidates.add(normalizePublicBase());
  } catch {
    // ignore missing base
  }
  if (endpoint && bucket) {
    const endpointBase = endpoint.replace(/\/+$/, '');
    baseCandidates.add(`${endpointBase}/${bucket}`);
    try {
      const endpointUrl = new URL(endpointBase);
      baseCandidates.add(`${endpointUrl.protocol}//${bucket}.${endpointUrl.host}`);
    } catch {
      // ignore invalid endpoint format
    }
  }
  for (const base of baseCandidates) {
    if (trimmed.startsWith(base)) {
      const key = trimmed.slice(base.length).replace(/^\/+/, '');
      return key || null;
    }
  }
  return null;
};

const buildObjectKey = (prefix: string, ext: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${prefix}/${year}/${month}/${day}/${crypto.randomUUID()}.${ext}`;
};

export const uploadImageDataUrl = async (value: string, prefix = 'uploads') => {
  const parsed = parseImageDataUrl(value);
  if (!parsed) return value;
  const { mime, data } = parsed;
  const buffer = Buffer.from(data, 'base64');
  const ext = getExtensionForMime(mime);
  const key = buildObjectKey(prefix, ext);
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );
  return `${normalizePublicBase()}/${key}`;
};

export const deleteImageIfManaged = async (value?: string | null) => {
  const key = getObjectKeyFromUrl(value);
  if (!key) return;
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

export const deleteImageArrayIfManaged = async (values?: string[] | null) => {
  if (!Array.isArray(values) || values.length === 0) return;
  for (const value of values) {
    await deleteImageIfManaged(value);
  }
};

export const deleteUnreferencedImages = async (
  previous?: string[] | null,
  next?: string[] | null
) => {
  if (!Array.isArray(previous) || previous.length === 0) return;
  const nextSet = new Set((next || []).filter(Boolean));
  for (const value of previous) {
    if (!nextSet.has(value)) {
      await deleteImageIfManaged(value);
    }
  }
};

export const uploadImageIfNeeded = async (
  value?: string | null,
  prefix = 'uploads'
): Promise<string | undefined> => {
  if (!value || typeof value !== 'string') return value ?? undefined;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image/')) return trimmed;
  return uploadImageDataUrl(trimmed, prefix);
};

export const uploadImageArrayIfNeeded = async (
  values?: string[] | null,
  prefix = 'uploads'
): Promise<string[] | undefined> => {
  if (!Array.isArray(values)) return values ?? undefined;
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const uploaded = await uploadImageIfNeeded(value, prefix);
    if (uploaded) {
      result.push(uploaded);
    }
  }
  return result;
};
