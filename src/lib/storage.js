// Armazenamento de arquivos em qualquer serviço compatível com S3:
// AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, MinIO (local)...
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import { config } from '../config.js';

const c = config.s3;
const s3 = c.disabled ? null : new S3Client({
  region: c.region,
  endpoint: c.endpoint,
  forcePathStyle: c.forcePathStyle,
  credentials: c.accessKeyId ? { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } : undefined,
});
const memory = new Map(); // usado só com S3_DISABLED=true (testes)

const safe = (name) => String(name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-120);
export const makeKey = (prefix, fileName) => `${prefix}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safe(fileName)}`;

export async function ensureBucket() {
  if (!s3) return console.warn('[s3] desativado (S3_DISABLED=true): arquivos ficam só em memória.');
  try { await s3.send(new HeadBucketCommand({ Bucket: c.bucket })); console.log(`[s3] bucket "${c.bucket}" OK`); }
  catch (e) {
    if (!c.createBucket) return console.warn(`[s3] bucket "${c.bucket}" inacessível: ${e.name || e.message}`);
    await s3.send(new CreateBucketCommand({ Bucket: c.bucket }));
    console.log(`[s3] bucket "${c.bucket}" criado`);
  }
}

export async function putFile(key, buffer, contentType) {
  if (!s3) { memory.set(key, { buffer, contentType }); return key; }
  await s3.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: buffer, ContentType: contentType || 'application/octet-stream' }));
  return key;
}

export async function getFile(key) {
  if (!s3) { const m = memory.get(key); if (!m) throw new Error('Arquivo não encontrado'); return m; }
  const r = await s3.send(new GetObjectCommand({ Bucket: c.bucket, Key: key }));
  return { buffer: Buffer.from(await r.Body.transformToByteArray()), contentType: r.ContentType };
}

export async function deleteFile(key) {
  if (!key) return;
  if (!s3) { memory.delete(key); return; }
  try { await s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key })); } catch (e) { console.warn('[s3] delete falhou', key, e.message); }
}
