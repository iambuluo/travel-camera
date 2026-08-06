const crypto = require('crypto');

// 服务端密钥（存 Vercel 环境变量 SERVER_SECRET，前端永远拿不到）
const SERVER_SECRET = process.env.SERVER_SECRET || 'travel-camera-server-secret-2026-change-me';

// HMAC 工具
function hmac(data) {
  return crypto.createHmac('sha256', SERVER_SECRET).update(String(data)).digest('hex');
}

// 激活码：TC-<随机8位>-<HMAC6位>，自包含签名，前端无法伪造（无 SERVER_SECRET）
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genActivationCode() {
  let r = '';
  for (let i = 0; i < 8; i++) r += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  const sig = hmac('ISSUE:' + r).slice(0, 6).toUpperCase();
  return 'TC-' + r + '-' + sig;
}
function verifyActivationCode(raw) {
  if (!raw) return false;
  const m = String(raw).trim().toUpperCase().match(/^TC-([A-Z2-9]{8})-([A-F0-9]{6})$/);
  if (!m) return false;
  const r = m[1], sig = m[2];
  return hmac('ISSUE:' + r).slice(0, 6).toUpperCase() === sig;
}

// 存储：优先 Vercel KV（绑定后自动可用），未绑定降级内存（仅 mock/开发用）
let kvMod = undefined;
async function getKv() {
  if (kvMod === undefined) {
    kvMod = null;
    if (process.env.KV_REST_API_URL) {
      try {
        const m = await import('@vercel/kv');
        kvMod = m.kv || null;
      } catch (e) { kvMod = null; }
    }
  }
  return kvMod;
}
const mem = new Map();
async function storeSet(k, v) {
  const kv = await getKv();
  if (kv) { try { await kv.set(k, v); return; } catch (e) {} }
  mem.set(k, v);
}
async function storeGet(k) {
  const kv = await getKv();
  if (kv) {
    try {
      const v = await kv.get(k);
      if (v !== undefined && v !== null) return v;
    } catch (e) {}
  }
  return mem.has(k) ? mem.get(k) : null;
}

function sendJSON(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); }
    });
  });
}
function newOrderId() {
  return 'TC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

module.exports = {
  SERVER_SECRET, hmac, genActivationCode, verifyActivationCode,
  storeSet, storeGet, sendJSON, readBody, newOrderId
};
