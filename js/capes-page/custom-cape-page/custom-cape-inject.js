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


/*
 * UNIVERSAL VARIABLES
 */

const categoryId = location.href.split("/")[location.href.split("/").length - 2];
const capeId = location.href.split("/")[location.href.split("/").length - 1];

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

    skinViewer.animation = new skinview3d.WalkingAnimation({
      progress: 3.3
    });
    skinViewer.animation.speed = 0.5;
    skinViewer.animation.paused = true;
    skinViewer.animation.headBobbing = false;

    window.skinViewer = skinViewer;

    skinViewer.fov = 40;
    skinViewer.camera.position.y = 22 * Math.cos(.01);
    skinViewer.playerWrapper.rotation.y = -90.53;
    skinViewer.globalLight.intensity = .65;
    skinViewer.cameraLight.intensity = .38;
    skinViewer.cameraLight.position.set(12, 25, 0);


    skinContainer.addEventListener(
      "contextmenu",
      (event) => event.stopImmediatePropagation(),
      true
    );
  })
}





/*
 * MAIN LOGIC
 */

waitForSelector("main", loadPage);