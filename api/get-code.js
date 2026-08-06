const u = require('./_lib/util');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const orderId = url.searchParams.get('orderId') || url.searchParams.get('order');
  if (!orderId) return u.sendJSON(res, 400, { ok: false, error: 'missing orderId' });
  const rec = await u.storeGet('order:' + orderId);
  if (!rec) return u.sendJSON(res, 404, { ok: false, error: 'order not found' });
  if (rec.status !== 'paid') return u.sendJSON(res, 402, { ok: false, error: 'order not paid' });
  return u.sendJSON(res, 200, { ok: true, code: rec.code });
};
