(() => {
    console.log("[SuperStorage] Initializing superStorage content script...");

    const cache = Object.create(null);
    let size = 0;

    let readyResolve;
    const readyPromise = new Promise(res => { readyResolve = res; });

    function injectPageScript(initialData) {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("js/page-superStorage.js");
        script.dataset.initial = JSON.stringify(initialData);
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }

    // Load storage from chrome.storage
    chrome.storage.local.get(null, items => {
        for (const k in items) { cache[k] = items[k]; size++; }
        injectPageScript(items);
        readyResolve();
    });

    function dispatchSync(key, value) {
        window.dispatchEvent(new CustomEvent("superstorage-sync", { detail: { key, value } }));
    }

    const api = {
        getItem(key) {
            if (key in cache) return cache[key];
            // fallback to localStorage
            const val = localStorage.getItem(key);
            if (val !== null) {
                cache[key] = val;
                size++;
                chrome.storage.local.set({ [key]: val });
                dispatchSync(key, val);
            }
            return val;
        },
        setItem(key, value) {
            const v = String(value);
            if (!(key in cache)) size++;
            cache[key] = v;
            chrome.storage.local.set({ [key]: v });
            localStorage.setItem(key, v);
            dispatchSync(key, v);
        },
        removeItem(key) {
            if (key in cache) {
                delete cache[key];
                size--;
                chrome.storage.local.remove(key);
                localStorage.removeItem(key);
                dispatchSync(key, null);
            }
        },
        clear() {
            if (size > 0) {
                for (const k of Object.keys(cache)) delete cache[k];
                size = 0;
                chrome.storage.local.clear();
                localStorage.clear();
                dispatchSync(null, null);
            }
        },
        key(index) { return Object.keys(cache)[index] ?? null; },
        get length() { return size; },
        _ready: readyPromise
    };

    globalThis.superStorage = new Proxy(api, {
        get(target, prop) { return prop in target ? target[prop] : target.getItem(prop); },
        set(target, prop, value) { if (prop in target) target[prop] = value; else target.setItem(prop, value); return true; },
        deleteProperty(target, prop) { if (prop in target) return false; target.removeItem(prop); return true; },
        has(target, prop) { return prop in target || prop in cache; },
        ownKeys() { return [...Reflect.ownKeys(api), ...Object.keys(cache)]; },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in target) return Object.getOwnPropertyDescriptor(target, prop);
            if (prop in cache) return { configurable: true, enumerable: true, value: cache[prop], writable: true };
        }
    });

    // Cross-tab sync
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        for (const k in changes) {
            const val = changes[k].newValue;
            if (val === undefined) { if (k in cache) { delete cache[k]; size--; } }
            else { if (!(k in cache)) size++; cache[k] = val; }
            dispatchSync(k, val ?? null);
        }
    });

    // Listen to page writes
    window.addEventListener("superstorage-write", e => {
        const { type, key, value } = e.detail;
        if (type === "set") { if (!(key in cache)) size++; cache[key] = value; chrome.storage.local.set({ [key]: value }); localStorage.setItem(key, value); }
        else if (type === "remove") { if (key in cache) { delete cache[key]; size--; chrome.storage.local.remove(key); localStorage.removeItem(key); } }
        else if (type === "clear") { for (const k of Object.keys(cache)) delete cache[k]; size = 0; chrome.storage.local.clear(); localStorage.clear(); }
        dispatchSync(key, type === "set" ? value : null);
    });
})();