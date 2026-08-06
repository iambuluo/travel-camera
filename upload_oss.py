#!/usr/bin/env python3
# 阿里云 OSS 上传脚本（一键把 index.html 传到 Bucket 并设静态首页）
# 用法：
#   pip install aliyun-oss-python-sdk
#   ACCESS_KEY_ID=xxx ACCESS_KEY_SECRET=yyy python upload_oss.py
# 环境变量：
#   ALI_ACCESS_KEY_ID / ALI_ACCESS_KEY_SECRET  —— 阿里云 AccessKey（仅需 OSS 权限）
#   OSS_BUCKET     —— Bucket 名称，如 travel-camera
#   OSS_ENDPOINT   —— 如 oss-cn-hangzhou.aliyuncs.com
#   OSS_REGION     —— 如 cn-hangzhou（部分地区需要，可不填）
import os, sys

try:
    from oss2 import Auth, Bucket, BucketCors, CorsRule
except ImportError:
    sys.exit("请先安装依赖：pip install aliyun-oss-python-sdk")

ACCESS_KEY_ID = os.environ.get("ALI_ACCESS_KEY_ID") or input("AccessKeyId: ").strip()
ACCESS_KEY_SECRET = os.environ.get("ALI_ACCESS_KEY_SECRET") or input("AccessKeySecret: ").strip()
BUCKET = os.environ.get("OSS_BUCKET") or input("Bucket 名称: ").strip()
ENDPOINT = os.environ.get("OSS_ENDPOINT") or input("Endpoint (如 oss-cn-hangzhou.aliyuncs.com): ").strip()

SRC_FILE = os.path.join(os.path.dirname(__file__), "index.html")

def main():
    if not os.path.exists(SRC_FILE):
        sys.exit(f"找不到 {SRC_FILE}")
    auth = Auth(ACCESS_KEY_ID, ACCESS_KEY_SECRET)
    bucket = Bucket(auth, ENDPOINT, BUCKET)

    # 上传 index.html（强制 text/html，关闭下载而非预览）
    bucket.put_object_from_file(
        "index.html", SRC_FILE,
        headers={"Content-Type": "text/html; charset=utf-8"}
    )
    print("✅ 已上传 index.html")

    # 设静态网站首页（默认首页/404 都指向 index.html）
    try:
        bucket.put_bucket_website("index.html", "index.html")
        print("✅ 已配置静态网站托管（首页=index.html）")
    except Exception as e:
        print("⚠️ 静态网站托管配置跳过：", e)

    # 设 CORS，允许浏览器 fetch 海拔/逆地理 API（不影响本页，但稳妥）
    try:
        rule = CorsRule(allowed_origins=["*"], allowed_methods=["GET"], allowed_headers=["*"])
        bucket.put_bucket_cors(BucketCors([rule]))
        print("✅ 已配置 CORS")
    except Exception as e:
        print("⚠️ CORS 配置跳过：", e)

    print("\n下一步（控制台）：传输管理→域名管理→绑定 aixiangji.autophoto.store→开 CDN→配 HTTPS")

if __name__ == "__main__":
    main()
