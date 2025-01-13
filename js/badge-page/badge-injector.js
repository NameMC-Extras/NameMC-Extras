var inject1 = document.createElement('script');
inject1.src = chrome.runtime.getURL('js/badge-page/badge-inject.js');
inject1.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject1);
