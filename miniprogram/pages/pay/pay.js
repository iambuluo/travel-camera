// 原生支付页：微信内 JSAPI 支付。H5 检测到小程序环境后跳转至此，由本页完成下单+支付。
const H5_BASE = 'https://travel-camera.vercel.app';
const API = H5_BASE + '/api';

Page({
  data: {},
  onLoad() { this.pay(); },
  async pay() {
    wx.showLoading({ title: '支付中' });
    try {
      const login = await this.wxLogin();
      const r1 = await this.wxRequest({
        url: API + '/create-order', method: 'POST',
        data: { tradeType: 'JSAPI', amount: 1990, wxcode: login.code }
      });
      if (!r1.data || !r1.data.ok) throw new Error((r1.data && r1.data.error) || '下单失败');
      const orderId = r1.data.orderId;
      const p = r1.data.payParams;
      await this.wxRequestPayment(p);
      const r2 = await this.wxRequest({ url: API + '/get-code?orderId=' + orderId });
      const code = r2.data && r2.data.code;
      wx.hideLoading();
      if (code) {
        wx.showToast({ title: '激活成功', icon: 'success' });
        setTimeout(() => wx.reLaunch({ url: '/pages/webview/webview?code=' + encodeURIComponent(code) }), 800);
      } else {
        wx.reLaunch({ url: '/pages/webview/webview' });
      }
    } catch (e) {
      wx.hideLoading();
      const cancel = e && (e.errMsg || '').indexOf('cancel') >= 0;
      wx.showToast({ title: cancel ? '已取消支付' : '支付失败', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/webview/webview' }), 1000);
    }
  },
  wxLogin() { return new Promise((res, rej) => wx.login({ success: res, fail: rej })); },
  wxRequest(opt) { return new Promise((res, rej) => wx.request(Object.assign({}, opt, { success: res, fail: rej }))); },
  wxRequestPayment(p) {
    return new Promise((res, rej) => {
      wx.requestPayment({
        timeStamp: p.timeStamp, nonceStr: p.nonceStr, package: p.package,
        signType: p.signType, paySign: p.paySign, success: res, fail: rej
      });
    });
  }
});
