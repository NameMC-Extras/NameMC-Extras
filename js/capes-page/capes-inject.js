console.log("Injecting capes page...");

const waitForSelector = (
  selector,
  callback,
  {
    root = document,
    timeout = 10000,
    once = true
  } = {}
) => {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) {
      callback?.(existing);
      return resolve(existing);
    }

    const observer = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (!el) return;

      if (once) observer.disconnect();
      callback?.(el);
      resolve(el);
    });

    observer.observe(root.documentElement || root, {
      childList: true,
      subtree: true
    });

    if (timeout) {
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`waitForSelector timeout: ${selector}`));
      }, timeout);
    }
  });
};

const waitForStorage = (key, callback) => {
  if (!window.superStorage) return setTimeout(() => waitForStorage(key, callback));
  const value = window.superStorage.getItem(key);
  if (value && value.length !== 0) return callback(value);
  setTimeout(() => waitForStorage(key, callback));
};

window.addEventListener("superstorage-ready", async () => {
  /*
   * UNIVERSAL VARIABLES
   */
  const enableBedrockCapes = superStorage.getItem("bedrockCapes") === "true";
  const hideOptifine = superStorage.getItem("hideOptifine") === "false";

  /*
   * FUNCTIONS
   */
  function getCapeCardHTML(cape, userCount, isBedrock = false) {
    const href = isBedrock ? `/cape/bedrock/${encodeURIComponent(cape.id)}`
      : `/cape/${encodeURIComponent(cape.category)}/${encodeURIComponent(cape.id)}`;
    const imgSrc = isBedrock ? cape.thumbnail_url : cape.image_render;
    const imgStyle = isBedrock ? "width:100%;height:100%;object-fit:cover;margin:0 auto;" : "";

    return `
    <div class="col-4 col-md-2">
      <div class="card mb-2">
        <a href="${href}">
          <div class="card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1" translate="no">${cape.name}</div>
          <div class="card-body position-relative text-center checkered p-1">
            <div>
              <img class="drop-shadow auto-size-square" loading="lazy" width="256" height="256"
                   src="${imgSrc}" alt="${cape.name}" title="${cape.name}" style="${imgStyle}">
            </div>
            <div class="position-absolute bottom-0 right-0 text-muted mx-1 small-xs normal-sm">${userCount}★</div>
          </div>
        </a>
      </div>
    </div>
  `;
  }

  /*
   * MAIN LOGIC
   */
  function addCapes(mainDiv) {
    const supabase_data = JSON.parse(superStorage.getItem("supabase_data"));

    // BEDROCK
    if (enableBedrockCapes) {
      const bedrockHTML = (supabase_data.bedrock_capes || [])
        .sort((a, b) => b.user_count - a.user_count)
        .map(cape => getCapeCardHTML(cape, cape.user_count, true))
        .join("");

      const bedrockRange = document.createRange();
      const bedrockFrag = bedrockRange.createContextualFragment(`
      <div>
        <h1 class="text-center pt-4">Bedrock Capes</h1>
        <hr class="mt-0">
        <div class="mb-2">
          <div class="row gx-2 justify-content-center">
            ${bedrockHTML}
          </div>
        </div>
      </div>
    `);
      mainDiv.append(bedrockFrag);
    }

    const categories = supabase_data.categories
      .filter(cat => !cat.hidden && (!hideOptifine || cat.id !== 'optifine'));

    const categoriesHTML = categories.map(cat => {
      const capes = supabase_data.capes
        .filter(cape => cape.category === cat.id)
        .map(cape => {
          cape.users = supabase_data.user_capes.filter(user => user.cape === cape.id);
          return cape;
        })
        .sort((a, b) => b.users.length - a.users.length)
        .map(cape => getCapeCardHTML(cape, cape.users.length))
        .join("");

      return `
      <div>
        <h1 class="text-center pt-4">${cat.name} Capes</h1>
        <hr class="mt-0">
        <div class="mb-2">
          <div class="row gx-2 justify-content-center">
            ${capes}
          </div>
        </div>
      </div>
    `;
    }).join("");

    const categoriesRange = document.createRange();
    const categoriesFrag = categoriesRange.createContextualFragment(categoriesHTML);
    mainDiv.append(categoriesFrag);
  }

  waitForStorage("supabase_data", () => waitForSelector("main", addCapes));
}, { once: true });
if (typeof superStorage !== "undefined") window.dispatchEvent(new Event("superstorage-ready"));