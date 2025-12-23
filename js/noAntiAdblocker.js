(() => {
    var noAntiAdblocker = document.createElement('script');
    noAntiAdblocker.src = chrome.runtime.getURL(`js/tinyShield.user.js`);
    noAntiAdblocker.type = "text/javascript";
    (document.head || document.documentElement).appendChild(noAntiAdblocker);
})();