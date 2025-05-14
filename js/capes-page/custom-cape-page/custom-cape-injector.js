// Inject skinview3d
const skinViewScript = document.createElement("script");
skinViewScript.src = chrome.runtime.getURL("js/skinview3d.bundle.js");
(document.head || document.documentElement).appendChild(skinViewScript);
skinViewScript.onload = function() {
  skinViewScript.remove();
};

// Inject the cape page script
const script = document.createElement("script");
script.src = chrome.runtime.getURL("js/capes-page/custom-cape-page/custom-cape-inject.js");
(document.head || document.documentElement).appendChild(script);
script.onload = function() {
  script.remove();
};
