(function () {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  var s = document.createElement('script');
  s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  s.defer = true;
  document.head.appendChild(s);
  OneSignalDeferred.push(function (OneSignal) {
    OneSignal.init({
      appId: '88feff76-68c8-4957-844f-c6e685905ba8',
      notifyButton: { enable: true, position: 'bottom-right' }
    });
  });
})();
