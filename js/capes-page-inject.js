console.log("Injecting capes page...");

/*
 * UNIVERSAL VARIABLES
 */
const mainDiv = document.getElementsByTagName("main").item(0);
const capesFileUrl = chrome.runtime.getURL('more-capes.json');
const cardSizes = {
  FIT_1: "col-md-12",
  FIT_2: "col-md-6",
  FIT_3: "col-md-4",
  FIT_4: "col-md-3",
  FIT_6: "col-md-2"
}





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
  getCardHTML(sizeClass = cardSizes.FIT_6) {
    return `
      <div class="col-4 ${sizeClass}">
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
function getCardSize(capeAmount) {
  if (capeAmount % 6 == 0) return cardSizes.FIT_6
  else if (capeAmount % 4 == 0) return cardSizes.FIT_4
  else if (capeAmount % 3 == 0) return cardSizes.FIT_3
  else if (capeAmount == 2) return cardSizes.FIT_2
  else if (capeAmount == 1) return cardSizes.FIT_1
  else return cardSizes.FIT_6;
}

/**
 * Returns an HTML string of all OptiFine cape cards
 * @returns {string}
 */
async function getOptifineCapes() {
  // TODO: replace this with an API call to get updated capes
  const capesRes = await fetch(capesFileUrl);
  const capesJSON = await capesRes.json();
  const optifineCapes = capesJSON.optifine.map(v => new Cape(v.name, `/cape/optifine/${v.name.toLowerCase().replace(" ", "-")}`, v.image_preview, v.users.length));
  const cardSizeClass = getCardSize(optifineCapes.length);
  let finalString = '';
  optifineCapes.forEach(cape => {
    finalString += cape.getCardHTML(cardSizeClass);
  })
  return finalString;
}

async function addOptifineCapeCategory() {
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

addOptifineCapeCategory();