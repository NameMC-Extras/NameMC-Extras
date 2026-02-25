(() => {
    console.log("[SuperStorage] Initializing superStorage page script...");

    const script = document.currentScript;
    const initialData = JSON.parse(script.dataset.initial || "{}");

    const cache = Object.create(null);
    let size = 0;

    // Initialize cache from initialData
    for (const k of Object.keys(initialData)) {
        cache[k] = initialData[k];
        size++;
    }

    const dispatchWrite = (type, key, value) =>
        window.dispatchEvent(new CustomEvent("superstorage-write", { detail: { type, key, value } }));

    const QUOTA_BYTES = 10 * 1024 * 1024; // 10 MB

    const api = {
        getItem(key) {
            if (key in cache) return cache[key];

            // fallback only
            const val = localStorage.getItem(key);
            if (val !== null) {
                cache[key] = val;
                size++;
                dispatchWrite("set", key, val);
            }
            return val;
        },

        setItem(key, value) {
            if (reservedKeys.has(key)) {
                console.warn(`[SuperStorage] Cannot set reserved key: "${key}"`);
                return;
            }

            const v = String(value);

            // --- Check quota ---
            let total = 0;
            for (const k of Object.keys(cache)) {
                const val = cache[k];
                if (val == null) continue;
                total += k.length * 2 + String(val).length * 2;
            }
            const newEntrySize = key.length * 2 + v.length * 2;

            if (total + newEntrySize >= QUOTA_BYTES) {
                console.warn(`[SuperStorage] Approaching quota. Clearing cape_data_ keys...`);

                // Remove cape_data_ keys first
                for (const k of Object.keys(cache)) {
                    if (k.startsWith("cape_data_")) {
                        delete cache[k];
                        size--;
                        dispatchWrite("remove", k);
                    }
                }

                // Recalculate total after removing cape_data_ keys
                total = 0;
                for (const k of Object.keys(cache)) {
                    const val = cache[k];
                    if (val == null) continue;
                    total += k.length * 2 + String(val).length * 2;
                }

                if (total + newEntrySize >= QUOTA_BYTES) {
                    console.warn(`[SuperStorage] Quota still exceeded. Cannot add key: "${key}"`);
                    return;
                }
            }
            // -------------------

            if (!(key in cache)) size++;
            cache[key] = v;
            dispatchWrite("set", key, v);
        },

        removeItem(key) {
            if (key in cache) {
                delete cache[key];
                size--;
                dispatchWrite("remove", key);
            }
        },

        clear() {
            for (const k of Object.keys(cache)) delete cache[k];
            size = 0;
            dispatchWrite("clear");
        },

        key(index) {
            return Object.keys(cache)[index] ?? null;
        },

        get length() {
            return size;
        }
    };

    const reservedKeys = new Set(Reflect.ownKeys(api));

    // Listen for content script updates
    window.addEventListener("superstorage-sync", ({ detail }) => {
        const { key, value } = detail;
        if (key === null) {
            for (const k of Object.keys(cache)) delete cache[k];
            size = 0;
            return;
        }
        if (value === null) {
            if (key in cache) {
                delete cache[key];
                size--;
            }
        } else {
            if (!(key in cache)) size++;
            cache[key] = value;
        }
    });

    globalThis.superStorage = new Proxy(api, {
        get(target, prop) {
            return prop in target ? target[prop] : target.getItem(prop);
        },
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
        has(target, prop) {
            return prop in target || prop in cache;
        },
        ownKeys() {
            return [...Reflect.ownKeys(api), ...Object.keys(cache)];
        },
        getOwnPropertyDescriptor(target, prop) {
            if (prop in target) return Object.getOwnPropertyDescriptor(target, prop);
            if (prop in cache)
                return { configurable: true, enumerable: true, value: cache[prop], writable: true };
        }
    });
})();