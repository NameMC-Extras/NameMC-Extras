/* copyright 2024 | Faav#6320 | github.com/bribes */
var inject = document.createElement('script');
inject.src = chrome.runtime.getURL('js/skinview3d.bundle.js');
inject.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject);