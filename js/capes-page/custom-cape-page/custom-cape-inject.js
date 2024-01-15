console.log("Creating custom cape page...");

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

const fixPauseBtn = () => {
  setTimeout(() => {
    var pauseBtn = document.querySelector('#play-pause-btn');
    var pauseIcon = pauseBtn.querySelector('i');
    if (paused == true) {
      pauseIcon.classList.remove('fa-pause');
      pauseIcon.classList.add('fa-play');
    } else {
      pauseIcon.classList.remove('fa-play');
      pauseIcon.classList.add('fa-pause');
    }
    pauseBtn.setAttribute('onclick', '');
    pauseBtn.onclick = () => {
      if (paused == false) {
        paused = true;
        pauseIcon.classList.remove('fa-pause');
        pauseIcon.classList.add('fa-play');
      } else {
        paused = false;
        pauseIcon.classList.remove('fa-play');
        pauseIcon.classList.add('fa-pause');
      }
      skinViewer.animation.paused = paused;
    }
  })
}

const fixElytraBtn = () => {
  setTimeout(() => {
    document.querySelector('#elytra-btn').onclick = () => {
      var elytraIconEl = document.querySelector('#elytra-btn i');
      if (!elytraOn) {
        elytraOn = true;
        elytraIconEl.classList.remove('fa-dove');
        elytraIconEl.classList.add('fa-square');
        elytraIconEl.parentElement.title = "No Elytra"
        skinViewer.loadCape(skinViewer.capeCanvas.toDataURL(), {
          backEquipment: "elytra"
        });
      } else {
        elytraOn = false;
        elytraIconEl.classList.remove('fa-square');
        elytraIconEl.classList.add('fa-dove');
        elytraIconEl.parentElement.title = "Elytra"
        skinViewer.loadCape(skinViewer.capeCanvas.toDataURL());
      }
    }
  })
}


/*
 * UNIVERSAL VARIABLES
 */

const categoryId = location.href.split("/")[location.href.split("/").length - 2];
const capeId = location.href.split("/")[location.href.split("/").length - 1];
var paused = true;
var elytraOn = false;

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
  switch (capeCategory) {
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
  const capes = custom_capes[categoryId];
  if (capes.length < 1) return null;
  let chosenCape = null;
  capes.forEach(v => {
    if (v.name.toLowerCase() == capeId.replace("-", " ")) {
      chosenCape = new CustomCape(v.name, v.description, v.image_src, v.users);
    }
  });
  return chosenCape;
}

async function loadPage(mainDiv) {
  console.log("Loading page!")

  mainDiv.style["margin-top"] = "1rem"

  // get cape and update page title
  const cape = await findCape(capeId);
  if (!cape) return;
  document.title = `${cape.name} | ${getCapeType(categoryId)} Cape | NameMC Extras`
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
            <canvas class="skin-3d drop-shadow auto-size align-top" width="300" height="400" style="cursor:move;width:300px"></canvas>
            <button id="play-pause-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;">
              <i class="fas fa-play"></i>
            </button>
            <button id="elytra-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:50px!important;" title="Elytra">
              <i class="fas fa-dove"></i>
            </button>
            <h5 class="position-absolute bottom-0 end-0 m-1 text-muted">${cape.users.length}★</h5>
          </div>
        </div>
        <div class="card mb-3">
          <div class="d-flex flex-column" style="max-height: 25rem">
            <div class="card-header py-1">
              <strong>Description</strong>
            </div>
            <div class="card-body py-2">
              ${cape.description ?? "Awarded for being a prominent member of the OptiFine community."}
            </div>
          </div>
        </div>
      </div>
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Profiles (${cape.users.length})</strong></div>
              <div class="card-body player-list py-2">
                  ${cape.users.map(u => `<a translate="no" href="/profile/${u.uuid}" ${u.note ? `title="${u.note}" data-note` : ''}>${u.uuid}</a>`).join("")}
              </div>
            </div>
          </div>
        </div>
    </div>
  `;

  waitForFunc("jQuery", () => jQuery(function($) {
    $("[data-note]").tooltip()
  }))
  
  // create skin viewer
  waitForFunc("skinview3d", () => {
    const skinContainer = document.getElementsByTagName("canvas").item(0);
    const steveDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABJlBMVEVMaXEAf38AqKgAmZmqfWaWX0EAaGhGOqUwKHIAr691Ry8qHQ1qQDA/Pz9ra2smIVuHVTuWb1sAYGBWScwoKCgmGgovHw8AzMw6MYkkGAgoGwoAW1sjIyMAnp5RMSWGUzQsHg4pHAyBUzkrHg0fEAsoGg0mGAstHQ6aY0QnGwstIBB3QjWcZ0gzJBEyIxBiQy8rHg6dak8mGgwsHhGKWTsoGwsjFwmEUjF0SC+iakd6TjOHWDokGAqDVTucY0WIWjk6KBQoHAsvIhGcaUz///+0hG27iXJSPYlSKCaaZEqfaEmPXj4vIA2AUzQ0JRJvRSxtQyqQXkOsdlo/KhWcY0aWX0Cze2K+iGytgG1CKhK1e2e9jnK9i3K2iWycclzGloC9jnS3gnKSJOIgAAAAAXRSTlMAQObYZgAAAvxJREFUWMPtlmebojAQx5cEkAiecHcgwrGArPW2997b9d779/8SN0nMruK6oL71//iYocyPmTA6MzPTla5X4VOdK3Y1M6r0quMAoFo0QiMMxwE4js0BT0DG6ICqQ3Nw9LEB4GvbziQA5i8A12MAbCe25yiAaQxAbIN0feTX6Hl2O17sdF4mzknVTvROZzFu254n6iIPwI7iZCFJkoVvH6KThSSObAro1kUmIGrY8fLGfpz8+vHn59/3r+P9jeXYbkSiLrIjqDcjrx2dyhfy19+XZ2enUduLmnVP1EWOFLzVzb3D44vzq++XV+fy8eHe5iqcFHWRA1BvrG0pRx8//zOMLzuvjpSttUadbiKvi+w98JpLK62w+O7TU9CLWjFsrSw1vUjURSYgDFvhvLK+/eZtrbZ7cLC7vf58/tl8C36QtC6KYa5aeAR6DBLHFV5LlYddifOoUkHGrDGbDeDlPACogCYFIPA3JkphAKBpZa0AgoWuriRJPg5qO7VaEIAtBQghQhDiNmErAd0Cyn2AgqSqEkIB+BMCtoro3QAAUyKIBPR6CqD1AdiNBAUYPMFWCRdiYMKg9wN8VfXheoDhi9uYIMwBENQ9EYDhglTf9zGmbhiD6TNvOFYUxZRBJhh07Qe4boHuBQWAj4r5QzHAVMIOEAdYsqyYdwF694ACIADEALAH1BsgJgdYDGBZPQBNG3gLAiCxTbwB0CdTgNkfgQBotwDCvAgWG0YFfhygpAClkgCUSg9AkipJGNMAOABstg0KB8gKjQRS6QFwR7FCKmUKLLgAoEXmughjt8ABlswiyQCwiICARXlj+KJPBj/LTEcw1VRTTTXKvICGdeXcAwdoIgAaNliMkkJuQO+84NI+AYL/+GBgLsgGlG8aTQBNQuq2+vwArdzbqdBAWx8FcOdcMBSQmheGzgXDAWU+L9wAREvLC0ilQAEWB5h9c0E2gKdiMgDrymbOCLQUQOEAMycgPS8o3dzpaENTyQHob/fsydYkAMjdsthocyfgP7DZYc3t4J05AAAAAElFTkSuQmCC";
    const capeURL = `https://assets.faav.top/capes/${cape.name.toLowerCase().split(" ").join("_")}.png`;

    let skinViewer = new skinview3d.SkinViewer({
      canvas: skinContainer,
      width: 300,
      height: 400,
      skin: steveDataURL,
      cape: capeURL,
      preserveDrawingBuffer: true
    });

    skinViewer.controls.enableRotate = true;
    skinViewer.controls.enableZoom = false;
    skinViewer.controls.enablePan = false;

    skinViewer.animation = new skinview3d.WalkingAnimation();
    skinViewer.animation.speed = 0.5;
    skinViewer.animation.paused = true;
    skinViewer.animation.headBobbing = false;

    window.skinViewer = skinViewer;

    skinViewer.fov = 30;
    skinViewer.camera.position.y = 21
    skinViewer.playerWrapper.rotation.y = -90.58;
    skinViewer.globalLight.intensity = .65;
    skinViewer.cameraLight.intensity = .38;
    skinViewer.cameraLight.position.set(12, 25, 0);
    skinViewer.zoom = 0.86


    skinContainer.addEventListener(
      "contextmenu",
      (event) => event.stopImmediatePropagation(),
      true
    );

    fixPauseBtn()
    fixElytraBtn()
  })
}





/*
 * MAIN LOGIC
 */

waitForSelector("main", loadPage);
