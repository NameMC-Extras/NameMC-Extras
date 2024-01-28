console.log("Injecting capes page...");

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
  * Returns HTML code for the cape's card
  * @param {SupabaseCape} cape
  * @param {number} userCount 
  * @returns {string}
  */
function getCapeCardHTML(cape, userCount) {
  return `
    <div class="col-4 col-md-2">
      <div class="card mb-2">
        <a href="${encodeURI(`https://namemc.com/cape/${cape.category}/${cape.id}`)}">
          ${(() => {
      var titleEl = document.createElement("div");
      titleEl.setAttribute("class", "card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1");
      titleEl.translate = "no";
      titleEl.textContent = cape.name;

      return titleEl.outerHTML;
    })()}
          <div class="card-body position-relative text-center checkered p-1">
            <div>
              ${(() => {
      var imageEl = document.createElement("img");
      imageEl.classList.add("drop-shadow");
      imageEl.classList.add("auto-size-square");
      imageEl.loading = "lazy";
      imageEl.width = 256;
      imageEl.height = 256;
      imageEl.src = cape.image_render;
      imageEl.alt = cape.name;
      imageEl.title = cape.name;

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

function addCapes(mainDiv) {
  const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));
  const categories = supabase_data.categories.filter(cat => cat.hidden === false)
  var categoriesHTML = categories.map(cat => {
    const capes = supabase_data.capes.filter(cape => cape.category == cat.id)

    // get user count
    const mapPromise = capes.map(cape => {
      cape.users = supabase_data.user_capes.filter(user => user.cape == cape.id)
      return cape;
    });

    const capeHTMLCards = [];
    mapPromise.sort((a, b) => b.users.length - a.users.length).forEach(cape => {
      capeHTMLCards.push(getCapeCardHTML(cape, cape.users.length));
    });
    // create category
    var categoryRange = document.createRange();
    var categoryHTML = categoryRange.createContextualFragment(`
        <temp>
          <br/>
          <h1 class="text-center"></h1>
          <hr class="mt-0">
          <div class="mb-2">
            <div class="row gx-2 justify-content-center">
              ${capeHTMLCards.join("")}
            </div>
          </div>
        </temp>
        `);

    categoryHTML.querySelector("h1").textContent = `${cat.name} Capes`;

    return categoryHTML.querySelector("temp").innerHTML;
  });

  var categoriesRange = document.createRange();
  var categoriesFrag = categoriesRange.createContextualFragment(categoriesHTML.join(""))
  mainDiv.append(categoriesFrag)
}

waitForStorage("supabase_data", () => waitForSelector("main", addCapes));
