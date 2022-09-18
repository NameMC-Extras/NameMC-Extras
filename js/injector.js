/* copyright 2022 | Faav#6320 | github.com/bribes */
var s = document.createElement('script');
s.src = chrome.runtime.getURL('js/namemc-inject.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);
