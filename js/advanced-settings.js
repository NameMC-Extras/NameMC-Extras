(() => {
    const AD_BLOCK_ID = "ne-adblock-stylesheet";
    const CUSTOM_CSS_ID = "ne-custom-css";

    function applyAdBlock(disabled) {
        document.getElementById(AD_BLOCK_ID)?.remove();
        if (disabled) return;

        const link = document.createElement("link");
        link.id = AD_BLOCK_ID;
        link.rel = "stylesheet";
        link.href = chrome.runtime.getURL("css/adblock.css");
        (document.head || document.documentElement).appendChild(link);

        // Keep user CSS last in the cascade when ad blocking is re-enabled live.
        const customStyle = document.getElementById(CUSTOM_CSS_ID);
        if (customStyle) customStyle.parentElement.appendChild(customStyle);
    }

    function applyCustomCss(css) {
        document.getElementById(CUSTOM_CSS_ID)?.remove();
        if (!css) return;

        const style = document.createElement("style");
        style.id = CUSTOM_CSS_ID;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    superStorage._ready.then(() => {
        applyAdBlock(superStorage.getItem("disableAdBlock") === "true");
        applyCustomCss(superStorage.getItem("customCss") || "");
    });

    window.addEventListener("superstorage-sync", (event) => {
        if (event.detail?.key === "disableAdBlock") applyAdBlock(event.detail.value === "true");
        if (event.detail?.key === "customCss") applyCustomCss(event.detail.value || "");
        if (event.detail?.key === null) {
            applyAdBlock(false);
            applyCustomCss("");
        }
    });
})();
