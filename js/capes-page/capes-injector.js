// Inject page-context scripts. async=false => parallel download, ordered execution
// (graph-utils executes before capes-inject in case it relies on its globals).
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

injectScript('js/capes-page/graph-utils.js');
injectScript('js/capes-page/capes-inject.js');
