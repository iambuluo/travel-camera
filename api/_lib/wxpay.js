const crypto = require('crypto');

const CFG = {
  mchid: process.env.WX_MCH_ID || '',
  appid: process.env.WX_APPID || '',
  appSecret: process.env.WX_APP_SECRET || '',
  apiv3: process.env.WX_APIV3_KEY || '',
  serial: process.env.WX_MCH_SERIAL || '',
  key: process.env.WX_APICLIENT_KEY || '',     // apiclient_key.pem 内容
  platformCert: process.env.WX_PLATFORM_CERT || '' // 微信平台证书 PEM（用于回调验签）
};

// 是否具备真实微信支付能力（缺任一凭证则进入 mock 模式）
function enabled() {
  return !!(CFG.mchid && CFG.appid && CFG.apiv3 && CFG.serial && CFG.key);
}

function rsaSign(privateKeyPem, data) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(data);
  return signer.sign(privateKeyPem, 'base64');
}

// 生成 v3 请求 Authorization 头
function buildAuthorization(method, urlPath, bodyStr) {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${ts}\n${nonce}\n${bodyStr}\n`;
  const sig = rsaSign(CFG.key, message);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${CFG.mchid}",nonce_str="${nonce}",signature="${sig}",timestamp="${ts}",serial_no="${CFG.serial}"`;
}

// 统一下单
async function unifiedOrder({ tradeType, description = '旅游相机-带海拔 永久版', amount = 1990, outTradeNo, openid, notifyUrl }) {
  const path = tradeType === 'JSAPI' ? '/v3/pay/transactions/jsapi' : '/v3/pay/transactions/h5';
  const url = 'https://api.mch.weixin.qq.com' + path;
  const body = {
    appid: CFG.appid, mchid: CFG.mchid, description,
    out_trade_no: outTradeNo, notify_url: notifyUrl,
    amount: { total: amount, currency: 'CNY' }
  };
  if (tradeType === 'JSAPI') body.payer = { openid };
  const bodyStr = JSON.stringify(body);
  const auth = buildAuthorization('POST', path, bodyStr);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'travel-camera/1.0' },
    body: bodyStr
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error('unifiedOrder fail: ' + resp.status + ' ' + text);
  return JSON.parse(text);
}

// 生成 JSAPI 支付参数（小程序 wx.requestPayment 用）
function buildJsapiPayParams(prepayId) {
  const pkg = 'prepay_id=' + prepayId;
  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${CFG.appid}\n${ts}\n${nonce}\n${pkg}\n`;
  const sig = crypto.createSign('RSA-SHA256').update(message).sign(CFG.key, 'base64');
  return { appId: CFG.appid, timeStamp: String(ts), nonceStr: nonce, package: pkg, signType: 'RSA', paySign: sig };
}

// 微信小程序 code 换 openid
async function code2session(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${CFG.appid}&secret=${CFG.appSecret}&js_code=${code}&grant_type=authorization_code`;
  const r = await fetch(url);
  const d = await r.json();
  if (d.errcode) throw new Error('code2session ' + d.errcode + ' ' + d.errmsg);
  return d.openid;
}

// 验签回调（平台证书公钥）
function verifyNotify({ timestamp, nonce, signatureB64, bodyStr }) {
  const cert = CFG.platformCert;
  if (!cert) return false;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(timestamp + '\n' + nonce + '\n' + bodyStr + '\n');
  try { return verifier.verify(cert, Buffer.from(signatureB64, 'base64')); } catch (e) { return false; }
}

// 解密回调资源（AES-256-GCM）
function decryptResource(resource) {
  const { ciphertext, nonce, associated_data } = resource;
  const buf = Buffer.from(ciphertext, 'base64');
  const authTag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(CFG.apiv3, 'utf8'), Buffer.from(nonce, 'utf8'));
  decipher.setAuthTag(authTag);
  if (associated_data) decipher.setAAD(Buffer.from(associated_data, 'utf8'));
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { CFG, enabled, unifiedOrder, buildJsapiPayParams, code2session, verifyNotify, decryptResource };
