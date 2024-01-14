console.log("Creating custom cape page...");

/*
 * UNIVERSAL VARIABLES
 */

const mainDiv = document.getElementsByTagName("main").item(0);
const capesFileUrl = chrome.runtime.getURL('more-capes.json');
const categoryId = location.href.split("/")[location.href.split("/").length-2];
const capeId = location.href.split("/")[location.href.split("/").length-1];





/*
 * CLASSES
 */

class CustomCape {
  /**
   * @param {string} name 
   * @param {string} description 
   * @param {string} capeURL 
   * @param {string[]} users 
   */
  constructor(name, description, capeURL, users) {
    this.name = name;
    this.description = description;
    this.capeURL = capeURL;
    this.users = users;
  }
}





/*
 * FUNCTIONS
 */

function getCapeType(capeCategory) {
  switch(capeCategory) {
    case 'optifine':
      return 'OptiFine';
  }
  return 'Unknown';
}

/**
 * Searches for a case-insensitive matching name in "more-capes.json", or returns null if unable to find
 * @param {string} capeId
 * @returns {CustomCape | null}
 */
async function findCape(capeId) {
  const capeRes = await fetch(capesFileUrl);
  const capesJSON = await capeRes.json();
  // only search in necessary category
  const capes = capesJSON[categoryId];
  if (capes.length < 1) return null;
  let chosenCape = null;
  capes.forEach(v => {
    if (v.name.toLowerCase() == capeId.replace("-", " ")) {
      chosenCape = new CustomCape(v.name, v.description, v.image_src, v.users);
    }
  });
  return chosenCape;
}

async function loadPage() {
  console.log("Loading page!")
  // get cape and update page title
  const cape = await findCape(capeId);
  if (!cape) return;
  document.title = `${cape.name} | ${getCapeType(categoryId)} Cape | NameMC`
  // update page
  mainDiv.innerHTML = `
    <h1 class="text-center" translate="no">
      ${cape.name}
      <small class="text-muted text-nowrap">${getCapeType(categoryId)} Cape</small>
    </h1>
    <hr class="mt-0">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body position-relative text-center p-0 checkered animation-paused">
            <canvas class="skin-3d drop-shadow auto-size align-top" width="300" height="400" style="cursor:move;width:300px" data-id="12b92a9206470fe2" data-cape="aa02d4b62762ff22" data-theta="210"></canvas>
            <button id="play-pause-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;" onclick="animateSkin(true)">
              <i class="fas fa-play"></i>
            </button>
            <h5 class="position-absolute bottom-0 end-0 m-1 text-muted">${cape.users.length}★</h5>
          </div>
        </div>
          <div class="ad-container mobile-mpu-container bg-body-tertiary d-flex d-md-none mb-3">
            <div id="nn_mobile_mpu1"></div>
          </div>
      </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Profiles (${cape.users.length})</strong></div>
              <div class="card-body player-list py-2">
                  ${cape.users.map(u => `<a translate="no" href="/profile/${u}">${u}</a>`).join("")}
              </div>
            </div>
          </div>
        </div>
    </div>
  `;
  // TODO: create skin viewer, currently broken
  return;
  const skinContainer = document.getElementsByTagName("canvas").item(0);
  let skinViewer = new skinview3d.SkinViewer({
    canvas: skinContainer,
    width: 300,
    height: 400,
    skin: null,
    preserveDrawingBuffer: true
  });
}





/*
 * MAIN LOGIC
 */

loadPage();