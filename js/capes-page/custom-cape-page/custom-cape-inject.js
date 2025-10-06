console.log("Creating custom cape page...");

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

const waitForSelector = function (selector, callback) {
  let query = document.querySelector(selector)
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
  if (window[func] ?? window.wrappedJSObject?.[func]) {
    setTimeout(() => {
      callback(window[func] ?? window.wrappedJSObject?.[func]);
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

const waitForCape = function (callback) {
  if (skinViewer.capeTexture) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForCape(callback);
    });
  }
};

const downloadCape = () => {
  var a = document.createElement("a");
  a.href = skinViewer.capeCanvas.toDataURL();
  a.setAttribute("download", "cape");
  a.click();
}

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

const fixElytraBtn = () => {
  if (!hideElytra) {
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
    });
  }
}

const fixStealBtn = () => {
  if (!hideSkinStealer) {
    setTimeout(() => {
      document.querySelector('#steal-btn').onclick = () => {
        // get cape id (last "/" of url... account for query params)
        const capeId = location.pathname.split("/").slice(-1)[0].split("?")[0];
        window.location.href = `${location.origin}/extras/skin-cape-test?cape=${capeId}&nmceCape=1`;
      }
    });
  }
}

const fixDownloadBtn = () => {
  setTimeout(() => {
    document.querySelector('#download-btn').onclick = downloadCape;
  });
}

/*
 * UNIVERSAL VARIABLES
 */

const categoryId = location.pathname.split("/")[2];
const capeId = location.pathname.split("/")[3];
var paused = (getCookie("animate") === "false");
var elytraOn = false;
var hideElytra = localStorage.getItem("hideElytra") === "false";
var hideSkinStealer = localStorage.getItem("hideSkinStealer") === "false";

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

async function loadPage() {
  console.log("Loading page!")

  // get cape and update page title
  const supabase_data = JSON.parse(localStorage.getItem("supabase_data"));
  let cape;
  if (categoryId == "bedrock") {
    const bedrockInfo = await (await fetch(`https://bedrock.lol/api/v1/capes/${capeId}`)).json();
    cape = new CustomCape(bedrockInfo.name, bedrockInfo.description, bedrockInfo.image_data, bedrockInfo.users);
    cape.user_count = bedrockInfo.user_count;
  } else {
    cape = supabase_data.capes.filter(cape => cape.id == capeId)[0];
  }
  if (!cape) return;
  const capeCategory = supabase_data.categories.filter(a => a.id == cape.category)[0]?.name ?? "Bedrock";
  const isBedrock = capeCategory === "Bedrock";
  document.title = `${cape.name} | ${capeCategory} Cape | NameMC Extras`
  let capeOwners = supabase_data.user_capes.filter(user => user.cape == capeId);
  if (capeOwners.length == 0) {
    capeOwners = cape.users;
  }
  // update page
  var capeRange = document.createRange();
  var capeHTML = capeRange.createContextualFragment(`
    ${(() => {
      var titleEl = document.createElement("h1");
      titleEl.classList.add("text-center");
      titleEl.translate = "no";
      titleEl.textContent = `
      ${cape.name} 
      `;

      var smallEl = document.createElement("small");
      smallEl.classList.add("text-muted");
      smallEl.classList.add("text-nowrap")
      smallEl.textContent = capeCategory + " Cape"
      titleEl.append(smallEl)

      return titleEl.outerHTML;
    })()}
    <hr class="mt-0">
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-body position-relative text-center p-0 checkered animation-paused">
            <canvas class="drop-shadow auto-size align-top" width="300" height="400" style="touch-action: none; width: 300px; height: 400px;"></canvas>
            <button id="play-pause-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;">
              <i class="fas fa-play"></i>
            </button>
            <button id="download-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:50px!important;" title="Download Cape">
              <i class="fas fa-download"></i>
            </button>
            ${!hideElytra ? `<button id="elytra-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:${(capeCategory !== "Bedrock" && !hideSkinStealer) ? 135 : 92.5}px!important;" title="Elytra">
              <i class="fas fa-dove"></i>
            </button>` : ''}
            ${(capeCategory !== "Bedrock" && !hideSkinStealer) ? `
              <button id="steal-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:32px;height:32px;margin-top:92.5px!important;" title="Steal Cape">
                <i class="fas fa-user-secret"></i>
              </button>  
            ` : ""}
            <h5 class="position-absolute bottom-0 end-0 m-1 text-muted">${cape.user_count || capeOwners.length}★</h5>
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
              <div class="card-header py-1"><strong>${isBedrock ? 'Java ' : ''}Profiles (${isBedrock ? capeOwners.filter(a => a.java_uuid).length : capeOwners.length})</strong></div>
              <div class="card-body player-list py-2"><div class="col-auto saving text-center"><span>•</span><span>•</span><span>•</span></div>
              </div>
            </div>
          </div>
          ${isBedrock && capeOwners.filter(a => !a.java_uuid).length ? `<div class="card mb-3">
            <div class="d-flex flex-column" style="max-height: 25rem">
              <div class="card-header py-1"><strong>Bedrock Profiles (${capeOwners.filter(a => !a.java_uuid).length})</strong></div>
              <div class="card-body player-list py-2" id="bedrockList"><div class="col-auto saving text-center"><span>•</span><span>•</span><span>•</span></div>
              </div>
            </div>
          </div>` : ''}
        </div>
    </div>
  `);

  waitForSelector("main", async (mainDiv) => {
    mainDiv.append(capeHTML);

    var descText = cape.description.toString() ?? "Awarded for something pretty cool this person did... I think?\nNo description available, contact a NameMC Extras developer!";
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

    // Add the graph card to the left column using functions from graph-utils.js
    const leftColumn = document.querySelector('.col-md-6');
    if (leftColumn && window.createUsageGraphCard) {
      const graphCard = window.createUsageGraphCard(capeId);
      leftColumn.appendChild(graphCard);

      // Initialize the graph after everything is set up
      setTimeout(() => {
        if (window.initializeGraph) {
          window.initializeGraph(capeId);
        }
      }, 100);
    }

    let badgeOwnerNames;
    if (isBedrock) {
      //capeOwners.push({ username: "..." });
      badgeOwnerNames = (await Promise.all(capeOwners.filter(a => a.java_uuid).map(async badge => {
        const resp = await fetch("https://api.gapple.pw/cors/sessionserver/" + badge.java_uuid);
        try {
          return await resp.json();
        } catch {
          return null;
        }
      }))).map(a => a.name);
    } else {
      badgeOwnerNames = (await Promise.all(capeOwners.map(async badge => {
        const resp = await fetch("https://api.gapple.pw/cors/sessionserver/" + badge.user);
        try {
          return await resp.json();
        } catch {
          return null;
        }
      }))).map(a => a && a.name);
    }

    document.querySelector(".player-list").innerHTML = (isBedrock ? capeOwners.filter(a => a.java_uuid) : capeOwners).map((u, i) => {
      let userEl;
      if (isBedrock && u.java_uuid) {
        userEl = document.createElement("a");
        userEl.href = "/profile/" + u.java_uuid;
      } else {
        userEl = document.createElement("a");
        userEl.href = "/profile/" + u.user;
      }
      userEl.textContent = badgeOwnerNames[i];
      userEl.translate = "no";
      if (u.note) {
        userEl.setAttribute("data-note", "");
        userEl.title = u.note;
      }

      return userEl.outerHTML;
    }).join(" ");

    if (isBedrock && document.querySelector('#bedrockList')) {
      document.querySelector("#bedrockList").innerHTML = capeOwners.filter(a => !a.java_uuid).map((u, i) => {
        let userEl;
        userEl = document.createElement("span");
        userEl.textContent = u.username;
        userEl.translate = "no";
        if (u.note) {
          userEl.setAttribute("data-note", "");
          userEl.title = u.note;
        }

        return userEl.outerHTML;
      }).join(" ");
    }

    // create skin viewer
    waitForFunc("skinview3d", () => {
      const skinContainer = document.getElementsByTagName("canvas").item(0);
      const steveDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABJlBMVEVMaXEAf38AqKgAmZmqfWaWX0EAaGhGOqUwKHIAr691Ry8qHQ1qQDA/Pz9ra2smIVuHVTuWb1sAYGBWScwoKCgmGgovHw8AzMw6MYkkGAgoGwoAW1sjIyMAnp5RMSWGUzQsHg4pHAyBUzkrHg0fEAsoGg0mGAstHQ6aY0QnGwstIBB3QjWcZ0gzJBEyIxBiQy8rHg6dak8mGgwsHhGKWTsoGwsjFwmEUjF0SC+iakd6TjOHWDokGAqDVTucY0WIWjk6KBQoHAsvIhGcaUz///+0hG27iXJSPYlSKCaaZEqfaEmPXj4vIA2AUzQ0JRJvRSxtQyqQXkOsdlo/KhWcY0aWX0Cze2K+iGytgG1CKhK1e2e9jnK9i3K2iWycclzGloC9jnS3gnKSJOIgAAAAAXRSTlMAQObYZgAAAvxJREFUWMPtlmebojAQx5cEkAiecHcgwrGArPW2997b9d779/8SN0nMruK6oL71//iYocyPmTA6MzPTla5X4VOdK3Y1M6r0quMAoFo0QiMMxwE4js0BT0DG6ICqQ3Nw9LEB4GvbziQA5i8A12MAbCe25yiAaQxAbIN0feTX6Hl2O17sdF4mzknVTvROZzFu254n6iIPwI7iZCFJkoVvH6KThSSObAro1kUmIGrY8fLGfpz8+vHn59/3r+P9jeXYbkSiLrIjqDcjrx2dyhfy19+XZ2enUduLmnVP1EWOFLzVzb3D44vzq++XV+fy8eHe5iqcFHWRA1BvrG0pRx8//zOMLzuvjpSttUadbiKvi+w98JpLK62w+O7TU9CLWjFsrSw1vUjURSYgDFvhvLK+/eZtrbZ7cLC7vf58/tl8C36QtC6KYa5aeAR6DBLHFV5LlYddifOoUkHGrDGbDeDlPACogCYFIPA3JkphAKBpZa0AgoWuriRJPg5qO7VaEIAtBQghQhDiNmErAd0Cyn2AgqSqEkIB+BMCtoro3QAAUyKIBPR6CqD1AdiNBAUYPMFWCRdiYMKg9wN8VfXheoDhi9uYIMwBENQ9EYDhglTf9zGmbhiD6TNvOFYUxZRBJhh07Qe4boHuBQWAj4r5QzHAVMIOEAdYsqyYdwF694ACIADEALAH1BsgJgdYDGBZPQBNG3gLAiCxTbwB0CdTgNkfgQBotwDCvAgWG0YFfhygpAClkgCUSg9AkipJGNMAOABstg0KB8gKjQRS6QFwR7FCKmUKLLgAoEXmughjt8ABlswiyQCwiICARXlj+KJPBj/LTEcw1VRTTTXKvICGdeXcAwdoIgAaNliMkkJuQO+84NI+AYL/+GBgLsgGlG8aTQBNQuq2+vwArdzbqdBAWx8FcOdcMBSQmheGzgXDAWU+L9wAREvLC0ilQAEWB5h9c0E2gKdiMgDrymbOCLQUQOEAMycgPS8o3dzpaENTyQHob/fsydYkAMjdsthocyfgP7DZYc3t4J05AAAAAElFTkSuQmCC";
      const capeURL = cape.image_src ?? ("data:image/png;base64," + cape.capeURL);

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
      skinViewer.animation.paused = paused
      skinViewer.animation.headBobbing = false;

      window.skinViewer = skinViewer;

      skinViewer.fov = 40;
      skinViewer.camera.position.y = 22 * Math.cos(.01);
      skinViewer.playerWrapper.rotation.y = -90.58;
      skinViewer.globalLight.intensity = .65;
      skinViewer.cameraLight.intensity = .38;
      skinViewer.cameraLight.position.set(12, 25, 0);
      skinViewer.zoom = 0.86;

      if (paused) {
        skinViewer.playerObject.skin.leftArm.rotation.x = 0.32;
        skinViewer.playerObject.skin.rightArm.rotation.x = -0.3;

        skinViewer.playerObject.skin.leftLeg.rotation.x = -0.32;
        skinViewer.playerObject.skin.rightLeg.rotation.x = 0.38;

        skinViewer.playerObject.cape.rotation.x = 0.3;
      }

      skinContainer.addEventListener(
        "contextmenu",
        (event) => event.stopImmediatePropagation(),
        true
      );

      fixPauseBtn()
      waitForCape(fixDownloadBtn)
      waitForCape(fixElytraBtn);
      if (capeCategory != "Bedrock") waitForCape(fixStealBtn);
    })

    waitForTooltip(() => {
      var iframeEl = document.createElement("iframe");
      iframeEl.width = 0;
      iframeEl.height = 0;
      iframeEl.style.display = 'none';
      iframeEl.srcdoc = `<script>
            window.top.$("[data-note]").tooltip()
        </script>`;
      document.documentElement.append(iframeEl);
      setTimeout(() => iframeEl.remove(), 1000);
    });
  });
}

/*
 * MAIN LOGIC
 */

waitForStorage("supabase_data", loadPage);
