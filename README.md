# 旅游相机 · 带海拔

单文件 H5 网页应用：拍照 / 相册导入自动烧录**实时海拔 + 地址 + 时间**水印。
**完全免费**，内置中文「☕ 请我喝杯咖啡」赞助入口（微信赞赏码，长按即打赏）。

> 本仓库是 H5 网页 + Vercel Serverless 后端。可部署为 HTTPS 链接在微信内打开，或用 `miniprogram/` 里的 web-view 壳嵌进微信小程序。

## 功能
- 实时海拔仪表：高精定位 + Open-Meteo 查海拔（Open-Elevation 兜底）+ BigDataCloud 逆地理出地址
- 相机叠加拍照加印 / 相册导入加印（自写 EXIF + XMP 双解析拿 GPS/拍摄时间）
- 系统原生相机：调用系统相机 App 拍照
- 离线手动编辑：无信号时手工填海拔 / 地址 / 时间 / 经纬度，直接写进水印
- 赞助入口：中文「请我喝杯咖啡」，弹出微信赞赏码供长按打赏（无需付费即可用全部功能）

## 目录结构
```
index.html              前端 H5（含赞助入口）
api/_lib/util.js        激活码 HMAC、存储、工具
api/_lib/wxpay.js       微信支付 v3 签名 / 统一下单 / 回调验签解密
api/create-order.js     创建订单（JSAPI / MWEB）
api/pay-notify.js       微信支付异步回调（验签 + 发码）
api/get-code.js         按订单号查询激活码
api/verify-license.js   激活码远程校验
miniprogram/            微信小程序 web-view 壳（叮当画）
vercel.json             静态部署配置
```

## 部署前端（Vercel，永久免费）
1. Vercel 导入 GitHub 仓库 `iambuluo/travel-camera` → Deploy，得到 `*.vercel.app` 永久链接
2. 之后 push 到 `main`，Vercel 自动重新部署

## 后端 API 路由
| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/create-order` | POST | `{tradeType:'JSAPI'\|'MWEB', amount, wxcode?}` → 返回 `mwebUrl` 或 `payParams`；未配凭证时返回 `mock:true` + 直接发码 |
| `/api/pay-notify` | POST | 微信支付回调，验签后写订单状态并发码 |
| `/api/get-code` | GET | `?orderId=` → 返回该订单激活码 |
| `/api/verify-license` | POST | `{code}` → `{valid}` 远程校验激活码 |

## 接入真实收款（微信支付，可选 / 未来启用）

> 当前版本为 **完全免费 + 微信赞赏码赞助**，不需要任何支付后端，也不依赖下面这些接口。以下仅记录「若未来想做付费版」时的可选方案，相关代码已内置在 `api/` 但未启用。

在 Vercel 项目 → Settings → Environment Variables 填入以下变量（不填则自动进入 **MOCK 模式**，不真收钱但可联调全部流程）：

| 变量 | 说明 |
|---|---|
| `SERVER_SECRET` | **必填**，服务端 HMAC 密钥，请改成随机长字符串（激活码签名依赖它，前端拿不到） |
| `WX_MCH_ID` | 微信支付商户号 |
| `WX_APPID` | 小程序/公众号 appid（如叮当画小程序） |
| `WX_APP_SECRET` | 小程序 secret（JSAPI 换 openid 用） |
| `WX_APIV3_KEY` | 微信支付 APIv3 密钥 |
| `WX_MCH_SERIAL` | 商户 API 证书序列号 |
| `WX_APICLIENT_KEY` | 商户私钥 `apiclient_key.pem` 的**完整内容**（含 -----BEGIN/END-----） |
| `WX_PLATFORM_CERT` | 微信平台证书 PEM（回调验签用，可在商户平台下载） |
| `PAY_NOTIFY_URL` | 可选，支付回调地址，缺省自动推断 |

### 存储（生产建议）
订单状态默认存内存（仅开发/mock 可用）。生产建议绑定 **Vercel KV**（Storage → Create → KV → Connect to project），绑定后 `KV_REST_API_URL` / `KV_REST_API_TOKEN` 自动注入，函数会自动改用 KV，多实例共享。

### MOCK 模式联调
不填任何 `WX_*` 变量时，`/api/create-order` 直接返回激活码（标记 `mock:true`），前端点击"购买"会立即激活。用于在没有商户号时验证：付费墙 → 下单 → 发码 → 激活 全链路。

## 微信小程序壳（叮当画）
`miniprogram/` 是 web-view 壳，让微信内支付走原生 JSAPI：
1. 微信开发者工具打开 `miniprogram/`，把 `project.config.json` 里的 `wxREPLACE_WITH_DINGDANGHUA_APPID` 改成叮当画真实 appid
2. 小程序后台 → 开发设置 → 业务域名：添加 `travel-camera.vercel.app`（需下载校验文件放到该域名根目录）
3. 小程序后台 → 开发设置 → request 合法域名：添加 `https://travel-camera.vercel.app`
4. 微信支付商户平台：将叮当画 appid 与该商户号绑定
5. （仅付费版）游客在微信里打开小程序 → web-view 加载 H5 → 点购买 → 跳转原生支付页 `pages/pay` → `wx.requestPayment` → 成功后回传激活码自动激活

> 外部浏览器打开 H5 则走 MWEB（微信 H5 支付），支付后 redirect 回 H5 自动拿码激活。

## 激活码机制
格式 `TC-XXXXXXXX-XXXXXX`：前 8 位随机 + 后 6 位 = `HMAC_SHA256(SERVER_SECRET, "ISSUE:"+前8位)` 前缀。
由后端签发、后端校验，**无 `SERVER_SECRET` 无法伪造**（前端即使看代码也拿不到密钥）。

## 安全提示
- 请勿在仓库或聊天中粘贴 GitHub / 微信支付密钥；如已泄露立即吊销
- `SERVER_SECRET` 必须改掉默认值，且只存于 Vercel 环境变量
- 微信支付私钥 (`WX_APICLIENT_KEY`) 仅存 Vercel 环境变量，不进代码、不进 git
