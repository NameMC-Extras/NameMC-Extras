console.log("Creating badge page...");

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

const waitForSelector = function (selector, callback) {
  query = document.querySelector(selector)
  if (query) {
    setTimeout((query) => {
      callback(query);
    }, null, query);
  } else {
    setTimeout(() => {
      waitForSelector(selector, callback);
    });
  }
};

const waitForFunc = function (func, callback) {
  if (window[func]) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForFunc(func, callback);
    });
  }
};

const waitForStorage = function (key, callback) {
  if (window.localStorage.getItem(key) && window.localStorage.getItem(key).length != 0) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForStorage(key, callback);
    });
  }
};

const waitForTooltip = function (callback) {
  if (typeof $ != 'undefined' && typeof $().tooltip != 'undefined') {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForTooltip(callback);
    });
  }
};

/*
 * UNIVERSAL VARIABLES
 */

const badgeId = location.pathname.split("/")[3];





/*
 * FUNCTIONS
 */

function loadPage(mainDiv) {
  console.log("Loading page!")

  mainDiv.style["margin-top"] = "1rem";

  // get badge and update page title
  const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));
  const badge = supabase_data.badges.filter(badge => badge.id == badgeId)[0];
  if (!badge) return;
  document.title = `${badge.name} | Badge | NameMC Extras`
  const badgeOwners = supabase_data.user_badges.filter(user => user.badge == badgeId);
  // update page
  var badgeRange = document.createRange();
  var badgeHTML = badgeRange.createContextualFragment(`
    ${(() => {
      var titleEl = document.createElement("h1");
      titleEl.classList.add("text-center");
      titleEl.translate = "no";
      titleEl.textContent = `
      ${badge.name} 
      `;

      var smallEl = document.createElement("small");
      smallEl.classList.add("text-muted");
      smallEl.classList.add("text-nowrap")
      smallEl.textContent = "NameMC Extras Badge"
      titleEl.append(smallEl)

      return titleEl.outerHTML;
    })()}
    <hr class="mt-0">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body position-relative text-center p-0 checkered animation-paused">
          ${(() => {
      var imageEl = document.createElement("img");
      imageEl.classList.add("drop-shadow");
      imageEl.classList.add("auto-size-square");
      imageEl.loading = "lazy";
      imageEl.width = 300;
      imageEl.height = 450;
      imageEl.style.padding = "56px";
      imageEl.src = badge.image;
      imageEl.alt = badge.name;
      imageEl.title = badge.name;

      return imageEl.outerHTML;
    })()}
            <h5 class="position-absolute bottom-0 end-0 m-1 text-muted">${badgeOwners.length}★</h5>
          </div>
        </div>
        <div class="card mb-3">
          <div class="d-flex flex-column" style="max-height: 25rem">
            <div class="card-header py-1">
              <strong>Description</strong>
            </div>
            ${(() => {
      var cardBody = document.createElement("div");
      cardBody.classList.add("card-body");
      cardBody.classList.add("py-2");
      cardBody.textContent = badge.description ?? "Awarded for unknown reasons.";

      return cardBody.outerHTML;
    })()}
          </div>
        </div>
      </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Profiles (${badgeOwners.length})</strong></div>
              <div class="card-body player-list py-2">
                ${badgeOwners.map(u => {
      var userEl = document.createElement("a");
      userEl.textContent = u.user;
      userEl.href = "/profile/" + u.user;
      userEl.translate = "no";
      if (u.note) {
        userEl.setAttribute("data-note", "");
        userEl.title = u.note;
      }

      return userEl.outerHTML;
    }).join("")}
              </div>
            </div>
          </div>
        </div>
    </div>
  `);

  mainDiv.append(badgeHTML)
}





/*
 * MAIN LOGIC
 */

waitForStorage("supabase_data", () => waitForSelector("main", loadPage));
