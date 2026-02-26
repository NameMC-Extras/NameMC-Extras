(() => {
  console.log("[SuperStorage] Initializing superStorage page script...");

  const script = document.currentScript;
  const initialData = JSON.parse(script?.dataset?.initial || "{}");

  const cache = Object.create(null);
  const keys = [];
  let size = 0;
  let usedBytes = 0;

  let readyResolve;
  const readyPromise = new Promise(res => { readyResolve = res; });

  const QUOTA_BYTES = 10 * 1024 * 1024;

  const byteSize = (k, v) => k.length * 2 + String(v).length * 2;

  // Initialize cache from initialData
  for (const k in initialData) {
    const v = initialData[k];
    cache[k] = v;
    keys.push(k);
    size++;
    usedBytes += byteSize(k, v);
  }

  const dispatchWrite = (type, key, value) =>
    window.dispatchEvent(new CustomEvent("superstorage-write", {
      detail: { type, key, value }
    }));

  const api = {
    getItem(key) {
      if (key in cache) return cache[key];

      try {
        const val = localStorage.getItem(key);
        if (val !== null) {
          cache[key] = val;
          keys.push(key);
          size++;
          usedBytes += byteSize(key, val);
          dispatchWrite("set", key, val);
        }
        return val;
      } catch {
        return null;
      }
    },

    setItem(key, value) {
      if (reservedKeys.has(key)) return;

      const v = String(value);
      const newSize = byteSize(key, v);

      if (key in cache) {
        usedBytes -= byteSize(key, cache[key]);
      } else {
        keys.push(key);
        size++;
      }

      // Quota check
      if (usedBytes + newSize >= QUOTA_BYTES) {
        // Remove cape_data_ first
        for (let i = keys.length - 1; i >= 0; i--) {
          const k = keys[i];
          if (k.startsWith("cape_data_")) {
            usedBytes -= byteSize(k, cache[k]);
            delete cache[k];
            keys.splice(i, 1);
            size--;
            dispatchWrite("remove", k);
          }
        }

        if (usedBytes + newSize >= QUOTA_BYTES) return;
      }

      cache[key] = v;
      usedBytes += newSize;
      dispatchWrite("set", key, v);
    },

    removeItem(key) {
      if (!(key in cache)) return;

      usedBytes -= byteSize(key, cache[key]);
      delete cache[key];

      const index = keys.indexOf(key);
      if (index !== -1) keys.splice(index, 1);

      size--;
      dispatchWrite("remove", key);
    },

    clear() {
      for (const k of keys) {
        dispatchWrite("remove", k);
      }

      keys.length = 0;
      for (const k in cache) delete cache[k];

      size = 0;
      usedBytes = 0;

      dispatchWrite("clear");
    },

    key(index) {
      return keys[index] ?? null;
    },

    get length() {
      return size;
    },

    _ready: readyPromise
  };

  const reservedKeys = new Set(Reflect.ownKeys(api));

  window.addEventListener("superstorage-sync", (event) => {
    let key, value;
    try {
      key = event.detail.key;
      value = event.detail.value;
    } catch {
      return;
    }

    if (key === null) {
      keys.length = 0;
      for (const k in cache) delete cache[k];
      size = 0;
      usedBytes = 0;
      return;
    }

    if (value === null) {
      if (key in cache) {
        usedBytes -= byteSize(key, cache[key]);
        delete cache[key];

        const i = keys.indexOf(key);
        if (i !== -1) keys.splice(i, 1);

        size--;
      }
    } else {
      const v = String(value);
      const newSize = byteSize(key, v);

      if (key in cache) {
        usedBytes -= byteSize(key, cache[key]);
      } else {
        keys.push(key);
        size++;
      }

      cache[key] = v;
      usedBytes += newSize;
    }
  });

  globalThis.superStorage = new Proxy(api, {
    get(target, prop) {
      return prop in target ? target[prop] : target.getItem(prop);
    },
    set(target, prop, value) {
      if (prop in target) target[prop] = value;
      else if (!reservedKeys.has(prop)) target.setItem(prop, value);
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
      return [...Reflect.ownKeys(api), ...keys];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target)
        return Object.getOwnPropertyDescriptor(target, prop);
      if (prop in cache)
        return { configurable: true, enumerable: true, value: cache[prop], writable: true };
    }
  });

  readyResolve();
  window.dispatchEvent(new Event("superstorage-ready"));
})();