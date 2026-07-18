// The capes index does not render usage graphs; graph-utils stays on cape detail pages.
function injectScript(src) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.async = false;
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
    return script;
}

injectScript('js/capes-page/capes-inject.js');
