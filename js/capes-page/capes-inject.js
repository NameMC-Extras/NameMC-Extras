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
        <a href="${cape.getURL()}">
          <div class="card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1" translate="no">${cape.name}</div>
          <div class="card-body position-relative text-center checkered p-1">
            <div>
              <img class="drop-shadow auto-size-square" loading="lazy" width="256" height="256" src="${cape.image}" alt="${cape.name}" title="${cape.name}">
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

async function addCapes(mainDiv) {
  const categories = await getAllCategories();
  categories.forEach(async cat => {
    const capes = await cat.getCapes();
    // get user count
    const mapPromise = await Promise.all(capes.map(async cape => {
      cape.users = await cape.getUsers();
      return cape;
    }));
    const capeHTMLCards = [];
    mapPromise.sort((a, b) => b.users.length - a.users.length).forEach(cape => {
      console.log(cape);
      capeHTMLCards.push(getCapeCardHTML(cape, cape.users.length));
    });
    // create category
    var categoryRange = document.createRange();
    var categoryHTML = categoryRange.createContextualFragment(`
      <br/>
      <h1 class="text-center">${cat.name} Capes</h1>
      <hr class="mt-0">
      <div class="mb-2">
        <div class="row gx-2 justify-content-center">
          ${capeHTMLCards.join("")}
        </div>
      </div>
    `);
    mainDiv.append(categoryHTML);
  });
}

waitForFunc("capes", () => waitForSelector("main", addCapes));