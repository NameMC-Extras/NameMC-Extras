var inject1 = document.createElement('script');
inject1.src = chrome.runtime.getURL('js/skinview3d.bundle.js');
inject1.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject1);

var inject2 = document.createElement('script');
inject2.src = chrome.runtime.getURL('js/skin-page/official-skin-page/official-skin-inject.js');
inject2.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject2);
