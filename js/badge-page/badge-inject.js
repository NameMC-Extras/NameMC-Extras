console.log("Creating badge page...");

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

const waitForStorage = function (key, callback) {
  if (window.superStorage && window.superStorage.getItem(key) && window.superStorage.getItem(key).length != 0) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForStorage(key, callback);
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

async function loadPage(mainDiv) {
  console.log("Loading page!")

  mainDiv.innerHTML = "";

  // get badge and update page title
  const supabase_data = JSON.parse(superStorage.getItem("supabase_data"));
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
      smallEl.textContent = "Extras Badge"
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
      imageEl.height = 300;
      imageEl.style.padding = "56px";
      imageEl.style["image-rendering"] = "pixelated";
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
            <div class="card-body py-2" id="description"></div>
          </div>
        </div>
      </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Profiles (${badgeOwners.length})</strong></div>
              <div class="card-body player-list py-2"><div class="col-auto saving text-center"><span>•</span><span>•</span><span>•</span></div>
              </div>
            </div>
          </div>
        </div>
    </div>
  `);

  mainDiv.append(badgeHTML);

  var descText = badge.description.toString() ?? "Awarded for something pretty cool this person did... I think?\nNo description available, contact a NameMC Extras developer!";
  var hasMdLink = /^(?=.*\[)(?=.*\])(?=.*\()(?=.*\)).*$/.test(descText);

  description.innerHTML = descText;

  if (hasMdLink) {
    var textAreaTag = document.createElement("textarea");
    textAreaTag.textContent = descText;
    descText = textAreaTag.innerHTML.replace(/(?:\r\n|\r|\n)/g, '<br>');

    var elements = descText.match(/\[.*?\)/g);
    if (elements && elements.length > 0) {
      for (el of elements) {
        let text = el.match(/\[(.*?)\]/)[1];
        let url = el.match(/\((.*?)\)/)[1];
        let aTag = document.createElement("a");
        let urlHref = new URL(url);
        urlHref.protocol = "https:";
        aTag.href = urlHref;
        aTag.textContent = text;
        aTag.target = '_blank';
        descText = descText.replace(el, aTag.outerHTML)
      }
    }

    description.innerHTML = descText;
  }

  var badgeOwnerNames = (await Promise.all(badgeOwners.map(async badge => {
    const resp = await fetch("https://api.gapple.pw/cors/sessionserver/" + badge.user);
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }))).map(a => a && a.name);

  document.querySelector(".player-list").innerHTML = badgeOwners.map((u, i) => {
    var userEl = document.createElement("a");
    userEl.textContent = badgeOwnerNames[i];
    userEl.href = "/profile/" + u.user;
    userEl.translate = "no";
    if (u.note) {
      userEl.setAttribute("data-note", "");
      userEl.title = u.note;
    }

    return userEl.outerHTML;
  }).join(" ")
}





/*
 * MAIN LOGIC
 */

waitForStorage("supabase_data", () => waitForSelector("main", loadPage));
