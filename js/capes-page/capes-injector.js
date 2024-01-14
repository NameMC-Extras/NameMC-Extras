/* copyright 2024 | Faav#6320 | github.com/bribes */

// THIS SCRIPT BELOW IS TEMPORARY SINCE WE DONT HAVE AN API YET

var inject2 = document.createElement('script');
inject2.src = chrome.runtime.getURL('more-capes.js');
inject2.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject2);

/*********************/

var inject1 = document.createElement('script');
inject1.src = chrome.runtime.getURL('js/capes-page/capes-inject.js');
inject1.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject1);