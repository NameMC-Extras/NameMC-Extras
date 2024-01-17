/* copyright 2024 | Faav#6320 | github.com/bribes */

fetch("https://assets.faav.top/data/capes.json").then(res => res.json()).then(data => {
    var inject = document.createElement('iframe');
    inject.srcdoc = `<script>window.top.capes=${JSON.stringify(data)}</script>`;
    inject.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(inject);
})

/*********************/

var inject1 = document.createElement('script');
inject1.src = chrome.runtime.getURL('js/capes-page/capes-inject.js');
inject1.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(inject1);
