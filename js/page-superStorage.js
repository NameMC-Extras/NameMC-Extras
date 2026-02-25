(() => {
    console.log("[SuperStorage] Initializing superStorage page script...");

    const script = document.currentScript;
    const initialData = JSON.parse(script.dataset.initial || "{}");

    const cache = Object.create(null);
    let size = 0;
    for (const k in initialData) { cache[k] = initialData[k]; size++; }

    const dispatchWrite = (type, key, value) => {
        window.dispatchEvent(new CustomEvent("superstorage-write", { detail: { type, key, value } }));
    };

    // Listen for content script updates
    window.addEventListener("superstorage-sync", ({ detail }) => {
        const { key, value } = detail;
        if (key === null) { for (const k of Object.keys(cache)) delete cache[k]; size = 0; return; }
        if (value === null) { if (key in cache) { delete cache[key]; size--; } }
        else { if (!(key in cache)) size++; cache[key] = value; }
    });

    const api = {
        getItem: k => cache[k] ?? null,
        setItem: (k, v) => { if (!(k in cache)) size++; cache[k] = String(v); dispatchWrite("set", k, String(v)); },
        removeItem: k => { if (k in cache) { delete cache[k]; size--; dispatchWrite("remove", k); } },
        clear: () => { if (size > 0) { for (const k of Object.keys(cache)) delete cache[k]; size = 0; dispatchWrite("clear"); } },
        key: i => Object.keys(cache)[i] ?? null,
        get length() { return size; }
    };

    window.superStorage = new Proxy(api, {
        get(target, prop) { return prop in target ? target[prop] : cache[prop] ?? null; },
        set(target, prop, value) { if (prop in target) target[prop] = value; else target.setItem(prop, value); return true; },
        deleteProperty(target, prop) { if (prop in target) return false; target.removeItem(prop); return true; },
        has(target, prop) { return prop in target || prop in cache; },
        ownKeys() { return [...Reflect.ownKeys(api), ...Object.keys(cache)]; },
        getOwnPropertyDescriptor(target, prop) { if (prop in target) return Object.getOwnPropertyDescriptor(target, prop); if (prop in cache) return { configurable: true, enumerable: true, value: cache[prop], writable: true }; }
    });
})();