// Helper: inject a page-context script.
// `ordered` scripts download in parallel but execute in insertion order
// (graph-utils must run before the inject script, which calls its globals).
function injectScript(src, ordered = false) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(src);
  if (ordered) script.async = false;
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  return script;
}

// skinview3d is awaited via polling inside the inject script, so it can load fully in parallel.
injectScript("js/skinview3d.bundle.js");

// graph-utils must execute before the inject script that uses its globals.
injectScript("js/capes-page/graph-utils.js", true);
injectScript("js/capes-page/official-cape-page/official-cape-inject.js", true);
