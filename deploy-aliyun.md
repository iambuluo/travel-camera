# 阿里云 OSS + CDN 部署（aixiangji.autophoto.store）

当前版本是**纯静态**（只需 `index.html` 一个文件）。按下面步骤，约 10 分钟上线，国内访问飞快。

---

## 第 1 步：建 Bucket（国内地域）

1. 登录 https://oss.console.aliyun.com
2. 创建 Bucket：
   - **Bucket 名称**：自定义（如 `travel-camera`，全局唯一）
   - **地域**：选**中国大陆**节点，如 `华东1（杭州）` → Endpoint 为 `oss-cn-hangzhou.aliyuncs.com`
   - **存储类型**：标准存储
   - **读写权限**：公共读
   - **阻止公共访问**：关闭（否则公共读不生效）
3. 创建后进入 Bucket → **数据管理 → 基础设置 → 静态网站托管**：
   - 开通，默认首页填 `index.html`，默认 404 页也填 `index.html`
   - 保存

---

## 第 2 步：上传文件

**方式 A（控制台，最简单）**
- Bucket → 文件管理 → 上传文件 → 把本仓库的 `index.html` 传上去
- 之后要加赞赏码图片，也传到这里（如 `qrcode.png`），再到 `index.html` 里把 `#sponsorQr` 的 `src` 指向它

**方式 B（脚本，给我密钥后我直接跑）**
- 见仓库 `upload_oss.py`，填好 AccessKey + Bucket + Endpoint 后运行即可

---

## 第 3 步：绑定自定义域名 + 开启 CDN

1. Bucket → **传输管理 → 域名管理 → 绑定域名**
2. 输入 `aixiangji.autophoto.store`
3. 勾选 **「开通阿里云 CDN 加速」**（国内节点加速，访问更快）
4. 若你的 `autophoto.store` 域名 DNS 托管在阿里云，勾「自动添加 CNAME」会自动帮你加解析；否则记下控制台给出的 **CNAME 目标地址**（形如 `aixiangji.autophoto.store.xxxx.cdn.dnsv1.com`），去域名服务商手动加一条 CNAME 记录（主机记录 `aixiangji` → 该地址）
5. 等 CNAME 生效后，点「启用」

---

## 第 4 步：配置 HTTPS（必须，否则手机打不开摄像头）

1. 域名管理 → 对应域名 → **HTTPS 配置 → 证书**
2. 选 **「免费证书」**（阿里云 DV 免费 cert，有效期 1 年，可自动续期）或上传你自己的证书
3. 开启「强制 HTTPS 跳转」
4. 等证书签发（几分钟）

> ⚠️ 相机 / 定位 / 相册都要求 **HTTPS 安全上下文**。没配 SSL，手机浏览器会直接拒绝开摄像头。

---

## 第 5 步：验证

- 浏览器开 `https://aixiangji.autophoto.store` → 看到落地页
- 手机浏览器打开 → 允许定位 → 海拔/地址正常
- 点「📷 系统相机」调起系统相机
- 加印一张 → 水印烧录正常

---

## 第 6 步（若已做小程序 web-view 壳）：更新业务域名

- `miniprogram/pages/webview/webview.js` 里把 `travel-camera.vercel.app` 改成 `aixiangji.autophoto.store`
- 微信公众平台 → 开发 → 开发设置 → **业务域名** 添加 `aixiangji.autophoto.store`（需下载校验文件放到站点根目录；OSS 直接传该文件即可）
- 重新上传小程序版本

---

## 国内海拔/逆地理 API 说明

页面 fetch 的第三方接口（open-meteo / bigdatacloud）国内一般可访问。
若你实测某地区海拔偶尔拉不到，可改用**高德地图 API**（免费 key，国内节点稳）做兜底——
需要的话我加一个高德分支（约 20 行改动）。
