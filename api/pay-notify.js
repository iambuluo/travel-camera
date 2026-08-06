const u = require('./_lib/util');
const w = require('./_lib/wxpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return u.sendJSON(res, 405, { ok: false });

  const ts = req.headers['wechatpay-timestamp'];
  const nonce = req.headers['wechatpay-nonce'];
  const sig = req.headers['wechatpay-signature'];

  const bodyStr = await new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
  });

  // MOCK 模式：不验证，直接放行（仅开发期）
  if (!w.enabled()) {
    return u.sendJSON(res, 200, { code: 'SUCCESS', message: 'mock' });
  }

  // 真实模式：验签 + 解密
  if (!w.verifyNotify({ timestamp: ts, nonce, signatureB64: sig, bodyStr })) {
    return u.sendJSON(res, 401, { code: 'FAIL', message: 'sign verify failed' });
  }
  let data;
  try {
    data = w.decryptResource(JSON.parse(bodyStr).resource);
  } catch (e) {
    return u.sendJSON(res, 200, { code: 'FAIL', message: 'decrypt fail' });
  }
  if (data.trade_state !== 'SUCCESS') {
    return u.sendJSON(res, 200, { code: 'SUCCESS', message: 'not paid yet' });
  }

  const orderId = data.out_trade_no;
  const existing = (await u.storeGet('order:' + orderId)) || {};
  const code = existing.code || u.genActivationCode();
  await u.storeSet('order:' + orderId, {
    status: 'paid', code,
    tradeState: data.trade_state, transactionId: data.transaction_id, at: Date.now()
  });
  return u.sendJSON(res, 200, { code: 'SUCCESS', message: 'ok' });
};
