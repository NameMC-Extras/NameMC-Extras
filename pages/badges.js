(async () => {
  const waitForSelector = (
    selector,
    callback,
    { root = document, timeout = 10000, once = true } = {}
  ) => {
    return new Promise((resolve, reject) => {
      const existing = root.querySelector(selector);
      if (existing) {
        callback?.(existing);
        return resolve(existing);
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            const el = node.matches(selector) ? node : node.querySelector(selector);
            if (el) {
              if (once) observer.disconnect();
              clearTimeout(timer);
              callback?.(el);
              return resolve(el);
            }
          }
        }
      });

      observer.observe(root.documentElement || root, { childList: true, subtree: true });

      const timer = timeout && setTimeout(() => {
        observer.disconnect();
        reject(new Error(`waitForSelector timeout: ${selector}`));
      }, timeout);
    });
  };

  const waitForStorage = (key, callback) => {
    if (!window.superStorage) return setTimeout(() => waitForStorage(key, callback));
    const value = window.superStorage.getItem(key);
    if (value && value.length !== 0) return callback(value);
    setTimeout(() => waitForStorage(key, callback));
  };

  /**
   * Returns HTML code for the badge's card
   * @param {SupabaseBadge} badge
   * @param {number} userCount 
   * @returns {string}
   */
  function getBadgeCardHTML(badge, userCount) {
    const badgeName = badge.name;
    const badgeID = encodeURIComponent(badge.id);
    const badgeImage = badge.image;

    return `
    <div class="col-4 col-md-2">
      <div class="card mb-2">
        <a href="/extras/badge/${badgeID}">
          <div class="card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1" translate="no">${badgeName}</div>
          <div class="card-body position-relative text-center checkered p-1">
            <div>
              <img class="drop-shadow auto-size-square"
                   loading="lazy"
                   width="136" height="136"
                   style="padding:9px; image-rendering: pixelated;"
                   src="${badgeImage}"
                   alt="${badgeName}"
                   title="${badgeName}">
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

  function addBadges(main) {
    const supabase_data = JSON.parse(superStorage.getItem("supabase_data"));
    main.innerHTML = "";

    // get user count
    const badges = supabase_data.badges.map(badge => {
      badge.usersCount = supabase_data.user_badges.reduce((count, user) => user.badge === badge.id ? count + 1 : count, 0);
      return badge;
    });

    badges.sort((a, b) => b.usersCount - a.usersCount);

    const badgeHTMLCards = badges.map(b => getBadgeCardHTML(b, b.usersCount)).join("");

    const badgesHTML = document.createRange().createContextualFragment(`
    <h1 class="text-center">Extras Badges</h1>
    <hr class="mt-0">
    <div class="mb-2">
      <div class="row gx-2 justify-content-center">
        ${badgeHTMLCards}
      </div>
    </div>
  `);

    main.append(badgesHTML);
  }

  await superStorage._ready;
  waitForStorage("supabase_data", () => waitForSelector("main", addBadges));
})();