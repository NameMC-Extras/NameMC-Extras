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

/*
 * UNIVERSAL VARIABLES
 */





/*
 * CLASSES
 */

class Cape {
  constructor(name, redirect, imageURL, userCount) {
    this.name = name;
    this.redirect = redirect;
    this.imageURL = imageURL;
    this.userCount = userCount;
  }

  /**
   * Returns HTML code for the cape's card
   * @param {string} sizeClass 
   * @returns {string}
   */
  getCardHTML() {
    return `
      <div class="col-4 col-md-2">
        <div class="card mb-2">
          <a href="${this.redirect}">
            <div class="card-header text-center text-nowrap text-ellipsis small-xs normal-sm p-1" translate="no">${this.name}</div>
            <div class="card-body position-relative text-center checkered p-1">
              <div>
                <img class="drop-shadow auto-size-square" loading="lazy" width="256" height="256" src="${this.imageURL}" alt="${this.name}" title="${this.name}">
              </div>
              <div class="position-absolute bottom-0 right-0 text-muted mx-1 small-xs normal-sm">${this.userCount}★</div>
            </div>
          </a>
        </div>
      </div>
    `;
  }
}





/*
 * FUNCTIONS
 */

/**
 * Returns a class for a 
 * @param {number} capeAmount 
 */
/**
 * Returns an HTML string of all OptiFine cape cards
 * @returns {string}
 */
async function getOptifineCapes() {
  // TODO: replace this with an API call to get updated capes
  const optifineCapes = custom_capes.optifine.map(v => new Cape(v.name, `/cape/optifine/${v.name.toLowerCase().replace(" ", "-")}`, `https://assets.faav.top/capes/${v.name.toLowerCase().split(" ").join("_")}_render.png`, v.users.length));
  let finalString = '';
  optifineCapes.forEach(cape => {
    finalString += cape.getCardHTML();
  })
  return finalString;
}

async function addOptifineCapeCategory(mainDiv) {
  mainDiv.innerHTML += `
    <br/>
    <h1 class="text-center">OptiFine Capes</h1>
    <hr class="mt-0">
    <div class="mb-2">
      <div class="row gx-2 justify-content-center">
        ${await getOptifineCapes()}
      </div>
    </div>
  `;
}





/*
 * MAIN LOGIC
 */

waitForSelector("main", addOptifineCapeCategory)