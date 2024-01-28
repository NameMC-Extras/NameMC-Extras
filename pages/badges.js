const waitForSelector = function (selector, callback) {
    query = document.querySelector(selector)
    if (query) {
        callback(query);
    } else {
        setTimeout(function () {
            waitForSelector(selector, callback);
        });
    }
};

const waitForFunc = function (func, callback) {
    if (window[func]) {
        callback();
    } else {
        setTimeout(function () {
            waitForFunc(func, callback);
        });
    }
};

const waitForStorage = function (key, callback) {
    if (window.localStorage.getItem(key) && window.localStorage.getItem(key).length != 0) {
        callback();
    } else {
        setTimeout(function () {
            waitForStorage(key, callback);
        });
    }
};

/*
 * FUNCTIONS
 */

/**
  * Returns HTML code for the badge's card
  * @param {SupabaseBadge} badge
  * @param {number} userCount 
  * @returns {string}
  */
function getBadgeCardHTML(badge, userCount) {
    return `
      <div class="col-4 col-md-2">
        <div class="card mb-2">
          <a href="${encodeURI(`https://namemc.com/badge/${badge.id}`)}">
            ${(() => {
            var titleEl = document.createElement("div");
            titleEl.setAttribute("class", "card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1");
            titleEl.translate = "no";
            titleEl.textContent = badge.name;

            return titleEl.outerHTML;
        })()}
            <div class="card-body position-relative text-center checkered p-1">
              <div>
                ${(() => {
            var imageEl = document.createElement("img");
            imageEl.classList.add("drop-shadow");
            imageEl.classList.add("auto-size-square");
            imageEl.loading = "lazy";
            imageEl.width = 136;
            imageEl.height = 136;
            imageEl.style.padding = "9px";
            imageEl.src = badge.image;
            imageEl.alt = badge.name;
            imageEl.title = badge.name;

            return imageEl.outerHTML;
        })()}
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

function addBadges(mainDiv) {
    const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));

    // get user count
    const mapPromise = supabase_data.badges.map(badge => {
        badge.users = supabase_data.user_badges.filter(user => user.badge == badge.id)
        return badge;
    });

    const badgeHTMLCards = [];
    mapPromise.sort((a, b) => b.users.length - a.users.length).forEach(badge => {
        badgeHTMLCards.push(getBadgeCardHTML(badge, badge.users.length));
    });

    var badgesRange = document.createRange();
    var badgesHTML = badgesRange.createContextualFragment(`
            <h1 class="text-center">Badges</h1>
            <hr class="mt-0">
            <div class="mb-2">
              <div class="row gx-2 justify-content-center">
                ${badgeHTMLCards.join("")}
              </div>
            </div>
          `);

    mainDiv.append(badgesHTML)
}

waitForStorage("supabase_data", () => waitForSelector("main", addBadges));
