(() => {
    const root = document.documentElement;
    const initial = document.currentScript?.dataset?.font || "";
    // Preview-font list for the settings dropdown, passed via dataset (read here in the
    // page world — works in Firefox, where a cross-world CustomEvent detail would not).
    const previewFonts = (document.currentScript?.dataset?.previewFonts || "").split(",").map(s => s.trim()).filter(Boolean);

    function applyFont(font) {
        const clean = (font || "").replace(/["'<>]/g, "").trim();
        document.getElementById("ne-custom-font-link")?.remove();
        document.getElementById("ne-custom-font-style")?.remove();
        if (!clean) {
            root.style.removeProperty("--bs-body-font-family");
            return;
        }

        // Load the font (multiple weights; Google clamps to what the font has).
        const link = document.createElement("link");
        link.id = "ne-custom-font-link";
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean)}:wght@300;400;500;600;700&display=swap`;
        (document.head || root).appendChild(link);

        const stack = `"${clean}", var(--bs-font-sans-serif, system-ui, sans-serif)`;
        root.style.setProperty("--bs-body-font-family", stack);

        // NameMC hardcodes font-family on body/headings (not via the Bootstrap var),
        // so beat those with !important. But SKIP any element that sets its own inline
        // font-family (e.g. a username styled with a custom font) so we don't clobber it.
        const sel = ["body", "h1", "h2", "h3", "h4", "h5", "h6", ".navbar-brand"]
            .map(s => `${s}:not([style*="font-family"])`).join(",");
        const style = document.createElement("style");
        style.id = "ne-custom-font-style";
        style.textContent = `${sel}{font-family:${stack} !important}`;
        (document.head || root).appendChild(style);
    }

    applyFont(initial);

    // Live updates: the content script sets data-ne-font on <html> when the font changes.
    // An attribute change on the shared element is observable across worlds (unlike a
    // CustomEvent's detail, which Firefox blocks between content and page scripts), so the
    // font updates live in Firefox too — no refresh needed.
    let lastFont = initial;
    new MutationObserver(() => {
        const v = root.getAttribute("data-ne-font") || "";
        if (v === lastFont) return;
        lastFont = v;
        applyFont(v);
    }).observe(root, { attributes: true, attributeFilter: ["data-ne-font"] });

    // The settings dropdown previews each font in its own style, which needs the fonts
    // loaded — and that load must happen here (page world) to avoid ORB. We trigger off
    // the font input being focused: a real DOM event on the shared #customfont element,
    // so there's no cross-world messaging (works in Firefox). Loaded once.
    let previewLoaded = false;
    document.addEventListener("focusin", (e) => {
        if (previewLoaded || !previewFonts.length) return;
        if (!e.target || e.target.id !== "customfont") return;
        previewLoaded = true;
        const families = previewFonts.map(f => "family=" + encodeURIComponent(f)).join("&");
        const link = document.createElement("link");
        link.id = "ne-font-preview-link";
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
        (document.head || root).appendChild(link);
    });
})();
