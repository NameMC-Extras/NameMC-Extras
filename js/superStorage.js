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

    // Load storage from Chrome
    chrome.storage.local.get(null, items => {
        for (const k in items) {
            cache[k] = items[k];
            size++;
        }
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
            if (reservedKeys.has(key)) {
                console.warn(`[SuperStorage] Cannot set reserved key: "${key}"`);
                return;
            }

            const v = String(value);
            if (!(key in cache)) size++;
            cache[key] = v;

            chrome.storage.local.set({ [key]: v });
            dispatchSync(key, v);
        },
        removeItem(key) {
            if (key in cache) {
                delete cache[key];
                size--;
                chrome.storage.local.remove(key);
                dispatchSync(key, null);
            }
        },
        clear() {
            for (const k of Object.keys(cache)) delete cache[k];
            size = 0;
            chrome.storage.local.clear();
            dispatchSync(null, null);
        },
        key(index) { return Object.keys(cache)[index] ?? null; },
        get length() { return size; },
        _ready: readyPromise
    };

    // Reserved API keys
    const reservedKeys = new Set(Reflect.ownKeys(api));

    globalThis.superStorage = new Proxy(api, {
        get(target, prop) { return prop in target ? target[prop] : target.getItem(prop); },
        set(target, prop, value) {
            if (prop in target) target[prop] = value;
            else if (!reservedKeys.has(prop)) target.setItem(prop, value);
            else console.warn(`[SuperStorage] Cannot overwrite reserved key: "${prop}"`);
            return true;
        },
        deleteProperty(target, prop) {
            if (prop in target || reservedKeys.has(prop)) return false;
            target.removeItem(prop);
            return true;
        },
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
            if (val === undefined) {
                if (k in cache) { delete cache[k]; size--; }
            } else {
                if (!(k in cache)) size++;
                cache[k] = val;
            }
            dispatchSync(k, val ?? null);
        }
    });

    // Listen to page writes
    window.addEventListener("superstorage-write", e => {
        const { type, key, value } = e.detail;
        if (type === "set") {
            if (!reservedKeys.has(key)) api.setItem(key, value);
        } else if (type === "remove") {
            api.removeItem(key);
        } else if (type === "clear") {
            api.clear();
        }
    });
})();