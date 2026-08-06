const u = require('./_lib/util');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return u.sendJSON(res, 405, { ok: false });
  const body = await u.readBody(req);
  const code = body.code;
  const valid = u.verifyActivationCode(code);
  // 此处可扩展：查库确认未吊销、记录激活设备等
  return u.sendJSON(res, 200, { ok: true, valid });
};
