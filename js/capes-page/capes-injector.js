var graphUtils = document.createElement('script');
graphUtils.src = chrome.runtime.getURL('js/capes-page/graph-utils.js');
graphUtils.onload = function () {
    var inject1 = document.createElement('script');
    inject1.src = chrome.runtime.getURL('js/capes-page/capes-inject.js');
    inject1.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(inject1);
    
    this.remove();
};
(document.head || document.documentElement).appendChild(graphUtils);
