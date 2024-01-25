console.log("Creating custom cape page...");

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

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

const waitForSVSelector = function (selector, callback) {
  if (document.querySelector(selector) && typeof window.skinview3d !== 'undefined' && typeof window.skinview3d.SkinViewer !== 'undefined' && window.skinview3d.SkinViewer) {
    callback();
  } else {
    setTimeout(function () {
      waitForSelector(selector, callback);
    });
  }
};

const waitForImage = function (callback, hash) {
  if (typeof window.namemc !== 'undefined' && typeof window.namemc.images !== 'undefined' && typeof window.namemc.images[hash] !== 'undefined' && window.namemc.images[hash].src) {
    callback();
  } else {
    setTimeout(function () {
      waitForImage(callback, hash);
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

const waitForTooltip = function (callback) {
  if (typeof $ != 'undefined' && typeof $().tooltip != 'undefined') {
    callback();
  } else {
    setTimeout(function () {
      waitForTooltip(callback);
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
      setCookie("animate", !paused);
      skinViewer.animation.paused = paused;
    }
  })
}

// add elytra button
const createElytraBtn = () => {
  waitForSelector('#play-pause-btn', () => {
    var pauseBtn = document.querySelector('#play-pause-btn');
    if (skinViewer.capeTexture && !document.querySelector("#elytra-btn")) {
      var elytraBtn = document.createElement('button');
      elytraBtn.id = 'elytra-btn';
      elytraBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
      elytraBtn.classList.add('p-0');
      elytraBtn.setAttribute('style', 'width:32px;height:32px;margin-top:50px!important;')
      elytraBtn.title = "Elytra";
      elytraIcon = document.createElement('i');
      elytraIcon.classList.add('fas');
      elytraIcon.classList.add('fa-dove');
      elytraBtn.innerHTML = elytraIcon.outerHTML;
      pauseBtn.outerHTML += elytraBtn.outerHTML;

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
    }
  });
}


/*
 * UNIVERSAL VARIABLES
 */

var paused = (getCookie("animate") === "false");
var elytraOn = false;

/*
 * CLASSES
 */

// create skin viewer
waitForSVSelector('.skin-3d', async () => {
  const oldContainer = document.querySelector('.skin-3d');
  oldContainer.classList.remove('skin-3d');
  const newContainer = document.createElement('canvas');
  newContainer.setAttribute('data-skin-hash', oldContainer.getAttribute('data-id'));
  newContainer.setAttribute('data-cape-hash', oldContainer.getAttribute('data-cape'));
  newContainer.setAttribute('data-model', oldContainer.getAttribute('data-model'));
  newContainer.classList.add('drop-shadow')
  newContainer.classList.add('auto-size')
  newContainer.classList.add('align-top')
  newContainer.id = 'skin_container';
  oldContainer.outerHTML = newContainer.outerHTML;

  const steveDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABJlBMVEVMaXEAf38AqKgAmZmqfWaWX0EAaGhGOqUwKHIAr691Ry8qHQ1qQDA/Pz9ra2smIVuHVTuWb1sAYGBWScwoKCgmGgovHw8AzMw6MYkkGAgoGwoAW1sjIyMAnp5RMSWGUzQsHg4pHAyBUzkrHg0fEAsoGg0mGAstHQ6aY0QnGwstIBB3QjWcZ0gzJBEyIxBiQy8rHg6dak8mGgwsHhGKWTsoGwsjFwmEUjF0SC+iakd6TjOHWDokGAqDVTucY0WIWjk6KBQoHAsvIhGcaUz///+0hG27iXJSPYlSKCaaZEqfaEmPXj4vIA2AUzQ0JRJvRSxtQyqQXkOsdlo/KhWcY0aWX0Cze2K+iGytgG1CKhK1e2e9jnK9i3K2iWycclzGloC9jnS3gnKSJOIgAAAAAXRSTlMAQObYZgAAAvxJREFUWMPtlmebojAQx5cEkAiecHcgwrGArPW2997b9d779/8SN0nMruK6oL71//iYocyPmTA6MzPTla5X4VOdK3Y1M6r0quMAoFo0QiMMxwE4js0BT0DG6ICqQ3Nw9LEB4GvbziQA5i8A12MAbCe25yiAaQxAbIN0feTX6Hl2O17sdF4mzknVTvROZzFu254n6iIPwI7iZCFJkoVvH6KThSSObAro1kUmIGrY8fLGfpz8+vHn59/3r+P9jeXYbkSiLrIjqDcjrx2dyhfy19+XZ2enUduLmnVP1EWOFLzVzb3D44vzq++XV+fy8eHe5iqcFHWRA1BvrG0pRx8//zOMLzuvjpSttUadbiKvi+w98JpLK62w+O7TU9CLWjFsrSw1vUjURSYgDFvhvLK+/eZtrbZ7cLC7vf58/tl8C36QtC6KYa5aeAR6DBLHFV5LlYddifOoUkHGrDGbDeDlPACogCYFIPA3JkphAKBpZa0AgoWuriRJPg5qO7VaEIAtBQghQhDiNmErAd0Cyn2AgqSqEkIB+BMCtoro3QAAUyKIBPR6CqD1AdiNBAUYPMFWCRdiYMKg9wN8VfXheoDhi9uYIMwBENQ9EYDhglTf9zGmbhiD6TNvOFYUxZRBJhh07Qe4boHuBQWAj4r5QzHAVMIOEAdYsqyYdwF694ACIADEALAH1BsgJgdYDGBZPQBNG3gLAiCxTbwB0CdTgNkfgQBotwDCvAgWG0YFfhygpAClkgCUSg9AkipJGNMAOABstg0KB8gKjQRS6QFwR7FCKmUKLLgAoEXmughjt8ABlswiyQCwiICARXlj+KJPBj/LTEcw1VRTTTXKvICGdeXcAwdoIgAaNliMkkJuQO+84NI+AYL/+GBgLsgGlG8aTQBNQuq2+vwArdzbqdBAWx8FcOdcMBSQmheGzgXDAWU+L9wAREvLC0ilQAEWB5h9c0E2gKdiMgDrymbOCLQUQOEAMycgPS8o3dzpaENTyQHob/fsydYkAMjdsthocyfgP7DZYc3t4J05AAAAAElFTkSuQmCC";

  const skinContainer = document.querySelector('#skin_container');

  let skinViewer = new skinview3d.SkinViewer({
    canvas: skinContainer,
    width: 300,
    height: 400,
    skin: steveDataURL,
    cape: null,
    preserveDrawingBuffer: true
  });

  waitForImage(() => {
    skinViewer.loadCape(window.namemc.images[skinContainer.getAttribute("data-cape-hash")].src);
    setTimeout(createElytraBtn)
  }, skinContainer.getAttribute("data-cape-hash"))

  skinViewer.controls.enableRotate = true;
  skinViewer.controls.enableZoom = false;
  skinViewer.controls.enablePan = false;

  skinViewer.animation = new skinview3d.WalkingAnimation();
  skinViewer.animation.speed = 0.5;
  skinViewer.animation.paused = paused
  skinViewer.animation.headBobbing = false;

  window.skinViewer = skinViewer;

  skinViewer.fov = 40;
  skinViewer.camera.position.y = 22 * Math.cos(.01);
  skinViewer.playerWrapper.rotation.y = -90.58;
  skinViewer.globalLight.intensity = .65;
  skinViewer.cameraLight.intensity = .38;
  skinViewer.cameraLight.position.set(12, 25, 0);
  skinViewer.zoom = 0.86

  if (paused) {
    skinViewer.playerObject.skin.leftArm.rotation.x = 0.3
    skinViewer.playerObject.skin.rightArm.rotation.x = -0.3

    skinViewer.playerObject.skin.leftLeg.rotation.x = -0.36
    skinViewer.playerObject.skin.rightLeg.rotation.x = 0.36
  }


  skinContainer.addEventListener(
    "contextmenu",
    (event) => event.stopImmediatePropagation(),
    true
  );

  fixPauseBtn()
})