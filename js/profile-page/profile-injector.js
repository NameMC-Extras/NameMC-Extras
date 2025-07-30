var inject1 = document.createElement('script');
inject1.src = chrome.runtime.getURL('js/skinview3d.bundle.js');
inject1.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject1);

var inject2 = document.createElement('script');
inject2.src = chrome.runtime.getURL('js/user-data-utils.js');
inject2.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject2);

var inject3 = document.createElement('script');
inject3.src = chrome.runtime.getURL('js/profile-page/profile-inject.js');
inject3.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject3);