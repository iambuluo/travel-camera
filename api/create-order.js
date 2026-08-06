const u = require('./_lib/util');
const w = require('./_lib/wxpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return u.sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  const body = await u.readBody(req);
  const tradeType = body.tradeType === 'JSAPI' ? 'JSAPI' : 'MWEB';
  const amount = Number(body.amount) || 1990; // 单位：分，19.90 元

  // MOCK 模式：未配置微信支付凭证时，直接发放激活码（仅供联调，不真收钱）
  if (!w.enabled()) {
    const orderId = u.newOrderId();
    const code = u.genActivationCode();
    await u.storeSet('order:' + orderId, { status: 'paid', code, mock: true, at: Date.now() });
    return u.sendJSON(res, 200, {
      ok: true, mock: true, orderId, code,
      msg: 'MOCK 模式：未配置微信支付，已直接发放激活码（仅供联调用，不真正收款）'
    });
  }

  // 真实模式
  const orderId = u.newOrderId();
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const notifyUrl = process.env.PAY_NOTIFY_URL || `${proto}://${req.headers.host}/api/pay-notify`;
  try {
    let openid = body.openid || '';
    if (tradeType === 'JSAPI' && !openid && body.wxcode) {
      openid = await w.code2session(body.wxcode);
    }
    if (tradeType === 'JSAPI' && !openid) {
      return u.sendJSON(res, 400, { ok: false, error: 'JSAPI 支付需要 openid（请先 wx.login 获取 code 传入 wxcode）' });
    }
    const r = await w.unifiedOrder({ tradeType, amount, outTradeNo: orderId, openid, notifyUrl });
    await u.storeSet('order:' + orderId, { status: 'pending', tradeType, at: Date.now() });
    if (tradeType === 'MWEB') {
      return u.sendJSON(res, 200, { ok: true, orderId, mwebUrl: r.h5_url });
    }
    const payParams = w.buildJsapiPayParams(r.prepay_id);
    return u.sendJSON(res, 200, { ok: true, orderId, payParams });
  } catch (e) {
    return u.sendJSON(res, 500, { ok: false, error: String(e.message || e) });
  }
};
