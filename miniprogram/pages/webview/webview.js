// H5 容器：把旅游相机 H5 嵌进小程序。小程序支付成功后回传 ?code=xxx 自动激活。
const H5_BASE = 'https://travel-camera.vercel.app';
Page({
  data: { src: H5_BASE },
  onLoad(q) {
    this.setData({ src: q && q.code ? H5_BASE + '?code=' + q.code : H5_BASE });
  }
});
