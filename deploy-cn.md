# 国内部署指南（aixiangji.autophoto.store）

> 结论先行：Vercel 绑自定义域名**不能**解决国内访问问题——Vercel 的服务器和骨干网都在境外，
> 绑域名只是换了门牌，流量仍走海外节点，国内照样卡/被墙。
> 真正的解法是把站点放到**国内可访问的主机**，再把子域名 `aixiangji.autophoto.store` 指过去。

---

## 0. 当前版本已经是纯静态，部署极简

`index.html` 不依赖任何后端（赞助用静态赞赏码图片，不调 `/api`）。
所以国内部署**只需要这一个文件**，不需要 Node、不需要 Vercel、不需要数据库。

> ⚠️ 相机拍照 / 定位 / 相册加印都要求 **HTTPS 安全上下文**。
> 无论选哪种方案，**必须给 `aixiangji.autophoto.store` 配 SSL 证书**，否则手机浏览器会拒绝打开摄像头。

---

## 方案 A（最推荐）：放到你已有的 autophoto.store 主机上

`autophoto.store` 已经在跑了，直接加个子域名站点即可，零额外成本。

### 若是 cPanel / 虚拟主机（最常见）
1. 主机面板 → **Subdomains（子域名）** → 新建 `aixiangji`，文档根指向一个空文件夹（如 `public_html/aixiangji`）
2. 把本仓库的 `index.html` 上传到该文件夹
3. 面板里给该子域名 **启用 SSL**（Let's Encrypt 一键）
4. 等 DNS 生效即可：`https://aixiangji.autophoto.store`

### 若是阿里云 / 腾讯云服务器（ECS / CVM）
- 用 Nginx 加一个 server 块，root 指向放 `index.html` 的目录，配好证书（见方案 B 的证书说明）
- 防火墙放行 443

---

## 方案 B：对象存储 + CDN（国内最稳、最省心）

适合没有现成虚拟主机的场景，按量付费极低。

### 阿里云 OSS
1. 建 Bucket（地域选**国内**，如华东1/华东2）→ 读写权限「公共读」
2. 上传 `index.html`
3. **绑定自定义域名** → 填 `aixiangji.autophoto.store` → 开启「CDN 加速」→ 上传/申请免费 SSL 证书
4. 到你的 DNS 服务商，给 `aixiangji.autophoto.store` 加 **CNAME** 指向 OSS 提供的加速域名

### 腾讯云 COS
1. 建存储桶（地域选国内）→ 上传 `index.html`
2. **自定义 CDN 加速域名** → `aixiangji.autophoto.store` → 配置 HTTPS 证书
3. DNS 加 **CNAME** 到 COS 加速域名

---

## 方案 C：小 Node 服务（仅在你要启用后端支付时用）

当前免费版用不到。等你拿到微信支付商户号、想在国内真收款时，用本仓库的 `server.js`：
- 零依赖：`node server.js`，默认端口 3000，自动以静态方式托管 `index.html`
- 同时预留了 `/api/*` 路由（把 `api/` 里的 Vercel 函数逻辑平移过来即可，详见 README 的支付章节）
- 用 PM2 / systemd 守护，Nginx 反代 + SSL

```bash
npm install -g pm2
pm2 start server.js --name aixiangji
pm2 save
```

---

## 1. DNS 配置（关键一步）

在你购买 `autophoto.store` 的域名服务商（阿里云/腾讯云/Namecheap/Cloudflare 等）后台：

| 类型 | 主机记录 | 记录值 | 说明 |
|---|---|---|---|
| A | `aixiangji` | 你的服务器公网 IP | 方案 A/ECS 用 |
| CNAME | `aixiangji` | OSS/COS 加速域名 | 方案 B 用 |

> ⚠️ 不要开 Cloudflare 的橙色云代理（Proxy）来"加速" Vercel——那只会继续走 Cloudflare 的海外回源，
> 解决不了国内访问，且相机功能对延迟敏感。**国内访问必须把真实内容放在国内节点。**

---

## 2. 同步更新小程序业务域名（若已做 web-view 壳）

`miniprogram/` 里 `pages/webview/webview.js` 目前嵌的是 `travel-camera.vercel.app`。
上线国内域名后，改成本地变量指向 `https://aixiangji.autophoto.store`，
并在**微信公众平台 → 开发 → 开发设置 → 业务域名**里添加 `aixiangji.autophoto.store`，
否则小程序内打开会白屏。

---

## 3. 国内海拔/逆地理 API 可靠性（建议，非必须）

当前用的第三方接口：
- `api.open-meteo.com`（海拔）—— 国内通常可访问 ✅
- `api.open-elevation.com`（兜底海拔）—— 国内偶尔慢/不稳定 ⚠️
- `api.bigdatacloud.net`（逆地理）—— 国内通常可访问 ✅

如想 100% 稳定，可改用**高德地图 API**（需申请免费 key）做海拔+逆地理，国内节点快且稳。
需要的话我可以加一个高德兜底分支。

---

## 4. 验证清单

- [ ] `https://aixiangji.autophoto.store` 能打开落地页
- [ ] 手机浏览器打开 → 允许定位 → 海拔/地址显示正常
- [ ] 点「📷 系统相机」能调起系统相机
- [ ] 加印一张照片，水印烧录正常
- [ ] 点「☕ 请我喝杯咖啡」弹出赞助框（赞赏码图就位后长按可打赏）
- [ ] 微信里打开链接可用（如需稳定分享，走小程序 web-view + 业务域名）
