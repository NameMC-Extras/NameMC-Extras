const waitForSelector = (selector, callback) => {
  const el = document.querySelector(selector);
  if (el) return callback(el);

  const observer = new MutationObserver(() => {
    const el = document.querySelector(selector);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
};

const waitForStorage = (key, callback) => {
  const value = window.localStorage.getItem(key);
  if (value && value.length !== 0) {
    callback();
  } else {
    requestAnimationFrame(() => waitForStorage(key, callback)); // faster polling
  }
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
  const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));
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

waitForStorage("supabase_data", () => waitForSelector("main", addBadges));