const capeDB = {};

class CapeTemplate {
  /**
   * 
   * @param {string} src 
   * @param {string} name 
   * @param {string} description
   * @param {string} redirect
   */
  constructor(src, name, description = null, redirect = null, java_equivalent = null) {
    this.src = src;
    this.name = name;
    this.description = description;
    this.redirect = redirect;
    this.java_equivalent = java_equivalent;
  }
}

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

const rows = 9;
const columns = 3;
const size = 32;

var paused = getCookie("animate") === "false";
var elytraOn = false;
var isHidden = localStorage.getItem("isHidden") !== "false";
var skinArt = localStorage.getItem("skinArt") == "true";
var layer = true;
var enableBedrockCapes = localStorage.getItem("bedrockCapes") === "true";
var hideBadges2 = localStorage.getItem("hideBadges2") === "false";
var hideCreatedAt = localStorage.getItem("hideCreatedAt") === "false";
var hideElytra = localStorage.getItem("hideElytra") === "false";
var hideLayers = localStorage.getItem("hideLayers") === "false";
var hideSkinStealer = localStorage.getItem("hideSkinStealer") === "false";
var hideOptifine = localStorage.getItem("hideOptifine") === "false";
var linksTextArea = localStorage.getItem("linksTextArea") ?? `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`;
var bedrockOnly = localStorage.getItem("bedrockOnly") !== "false";

var currentSkinId = null;
var currentDataModel = "classic";
var currentCape = null;
var nmceCape = false;

/* Cape card creator */
/**
 * @param {CapeTemplate[]} capes 
 * @param {string} title
 * @param {function} callback 
 * @param {boolean} showAmount 
 * @param {string} redirect
 */
function createCapeCard(capes, title, callback = console.log("Successfully made cape card!"), showAmount = false, redirect = null) {
  let titleArray = title.split(" ");
  titleArray.shift();

  // Create cape card
  const cardDiv = document.createElement("div");
  cardDiv.id = title.toLowerCase().replace(" ", "-");
  cardDiv.className = "card mb-3";
  cardDiv.innerHTML = `
        <div class="card-header py-1" style="display: flex; justify-content: space-between;">
            <strong>
                ${redirect ? `<a href="${redirect}" target="_blank" rel="nofollow noopener noreferrer">` : ""}${title.split(" ")[0]}${redirect ? `</a>` : ""}${" " + titleArray.join(" ")}${showAmount ? " (" + capes.length + ")" : ""}
            </strong>
            <div>
              <a href="javascript:void(0)" class="color-inherit" title="Bedrock Only Capes" id="bedrockBtn">
                ${bedrockOnly ? '<i class="fas fa-fw fa-eye"></i>' : '<i class="fas fa-fw fa-eye-slash"></i>'}
              </a>
            </div>
        </div>
        <div class="card-body text-center" style="padding: 3px; width: 324px; margin: auto; text-align: center;">
        </div>
    `;

  // Render capes
  capes.forEach(cape => {
    createCape(cape.src, cardDiv.querySelector("div.card-body.text-center"), cape.name, cape.description, cape.redirect ?? cape, cape.java_equivalent)
  });

  // find element with class name "col-md-auto order-md-1", then make cardDiv come after the third "card mb-3" classed element
  const colDiv = document.querySelector(".col-md-auto.order-md-1");
  const cardDivs = colDiv.querySelectorAll(".card.mb-3");
  if (cardDivs.length > 2) {
    colDiv.insertBefore(cardDiv, cardDivs[2].nextSibling);
  } else {
    colDiv.appendChild(cardDiv);
  }

  callback(cardDiv);
}


/* Cape canvas creator */
/**
 * @param {string} src 
 * @param {HTMLElement} parentElement 
 * @param {string} name 
 * @param {string} description 
 * @param {string} redirect 
 */
function createCape(src, parentElement, name = "", description = "", redirect = "", java_equivalent = "") {
  let capeCanvas = document.createElement("canvas");
  capeCanvas.className = "cape-2d align-top skin-button";
  let capeDataHash = `custom-${name.replace(" ", "-").toLowerCase()}`;
  capeCanvas.setAttribute("data-cape-hash", capeDataHash);
  capeDB[capeDataHash] = src;
  capeCanvas.width = 40;
  capeCanvas.height = 64;
  capeImage = new Image();
  capeImage.src = src;

  capeImage.onload = () => {
    const ctx = capeCanvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    if (capeImage.src !== src) capeImage.src = src;
    const localCapeScale = capeScale(capeImage.height)
    ctx.drawImage(capeImage, localCapeScale, localCapeScale, 10 * localCapeScale, 16 * localCapeScale, 0, 0, capeCanvas.width, capeCanvas.height)
    createCapeEvents();
  }

  // Puts the image in a href
  let featureImageHref = document.createElement("a");
  featureImageHref.href = redirect ? redirect : src;
  if (java_equivalent) featureImageHref.dataset['java_equivalent'] = java_equivalent;
  featureImageHref.setAttribute("data-toggle", "tooltip"),
    featureImageHref.setAttribute("data-html", "true")
  if (typeof name !== 'undefined') {
    featureImageHref.setAttribute("title", name)
  }
  featureImageHref.appendChild(capeCanvas);
  parentElement.appendChild(featureImageHref);
}


/* Creates cape events for the custom viewer */
function createCapeEvents() {
  let capeChildren = document.getElementsByClassName("cape-2d")
  console.log(`Found ${capeChildren.length} capes`)
  for (var i = 0; i < capeChildren.length; i++) {
    capeChildren[i].addEventListener('mouseover', (event) => {
      for (var i = 0; i < capeChildren.length; i++) {
        capeChildren[i].classList.remove("skin-button-selected");
      }
      event.target.classList.add("skin-button-selected");
      let capeHash = event.target.getAttribute("data-cape-hash")

      if (capeHash && !capeHash.startsWith("custom-")) {
        let capeUrl = "https://texture.namemc.com/" + capeHash.substring(0, 2) + "/" + capeHash.substring(2, 4) + "/" + capeHash + ".png";
        this.skinViewer.loadCape(capeUrl)
        console.log("capeEvent: Mojang/Optifine")
      } else if (capeHash && capeHash.startsWith("custom-")) {
        const options = {};
        if (elytraOn) options.backEquipment = "elytra";
        this.skinViewer.loadCape(capeDB[capeHash], options);
        console.log("capeEvent: Custom")
      }
    })
  }
}

const waitForSelector = function (selector, callback) {
  if (document.querySelector(selector)) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForSelector(selector, callback);
    });
  }
};

const waitForSVSelector = function (selector, callback) {
  if (document.querySelector(selector) && typeof window.skinview3d !== 'undefined' && typeof window.skinview3d.SkinViewer !== 'undefined' && window.skinview3d.SkinViewer) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForSVSelector(selector, callback);
    });
  }
};

const waitForImage = function (callback, hash) {
  if (typeof window.namemc !== 'undefined' && typeof window.namemc.images !== 'undefined' && typeof window.namemc.images[hash] !== 'undefined' && window.namemc.images[hash].src) {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForImage(callback, hash);
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

const waitForSupabase = function (callback) {
  var supabase_data = window.localStorage.getItem("supabase_data");
  if (supabase_data && supabase_data.length > 0) {
    setTimeout((supabase_data) => {
      callback(supabase_data);
    }, null, JSON.parse(supabase_data));
  } else {
    setTimeout(() => {
      waitForSupabase(callback);
    });
  }
};

const waitForTooltip = function (callback) {
  if (typeof $ !== 'undefined' && typeof $().tooltip !== 'undefined') {
    setTimeout(() => {
      callback();
    });
  } else {
    setTimeout(() => {
      waitForTooltip(callback);
    });
  }
};

const downloadSkinArt = () => {
  var a = document.createElement("a");
  a.href = resizedArt.toDataURL();
  a.setAttribute("download", "skinart");
  a.click();
}

// toggle skin layers
const toggleLayers = () => {
  var layerIcon = document.querySelector("#layer-btn i");
  if (layer === false) {
    layer = true;
    layerIcon.className = "fas fa-clone";
    layerIcon.parentElement.title = "No Layers";
  } else if (layer === true) {
    layer = false;
    layerIcon.className = "far fa-clone";
    layerIcon.parentElement.title = "Layers";
  }
  skinViewer.playerObject.skin.head.outerLayer.visible = layer;
  skinViewer.playerObject.skin.body.outerLayer.visible = layer;
  skinViewer.playerObject.skin.rightArm.outerLayer.visible = layer;
  skinViewer.playerObject.skin.leftArm.outerLayer.visible = layer;
  skinViewer.playerObject.skin.rightLeg.outerLayer.visible = layer;
  skinViewer.playerObject.skin.leftLeg.outerLayer.visible = layer;
}

// fix pause button
const fixPauseBtn = () => {
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
    if (paused === false) {
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
}

// add layer button
const createLayerBtn = () => {
  if (!hideLayers) {
    waitForSelector('#play-pause-btn', () => {
      let pauseBtn = document.querySelector('#play-pause-btn');
      let layerBtn = document.createElement('button');
      layerBtn.id = 'layer-btn';
      layerBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
      layerBtn.setAttribute('style', 'width:32px;height:32px;margin-top:50px!important;')
      layerBtn.title = "No Layers";
      let layerIcon = document.createElement('i');
      layerIcon.classList.add('fas');
      layerIcon.classList.add('fa-clone');
      layerBtn.innerHTML = layerIcon.outerHTML;
      pauseBtn.outerHTML += layerBtn.outerHTML;
    });
  }
}

// add elytra button
const createElytraBtn = () => {
  if (!hideElytra) {
    waitForSelector('#play-pause-btn', () => {
      let pauseBtn = document.querySelector('#play-pause-btn');
      if (skinViewer.capeTexture && !document.querySelector("#elytra-btn")) {
        let elytraBtn = document.createElement('button');
        elytraBtn.id = 'elytra-btn';
        elytraBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0');
        let margin = 135;
        if (hideLayers) margin -= 42.5;
        if (hideSkinStealer) margin -= 42.5;
        if (document.querySelectorAll(".skin-2d.skin-button").length > 0) elytraBtn.setAttribute('style', `width:32px;height:32px;margin-top:${margin}px!important`);
        else {
          elytraBtn.setAttribute('style', 'width:32px;height:32px;margin-top:92.5px!important');
        }

        elytraBtn.title = "Elytra";
        let elytraIcon = document.createElement('i');
        elytraIcon.classList.add('fas');
        elytraIcon.classList.add('fa-dove');
        elytraBtn.innerHTML = elytraIcon.outerHTML;
        pauseBtn.outerHTML += elytraBtn.outerHTML;

        document.querySelector('#elytra-btn').onclick = () => {
          let elytraIconEl = document.querySelector('#elytra-btn i');
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
}

// add steal button
const createStealBtn = () => {
  if (!hideSkinStealer) {
    waitForSelector('#play-pause-btn', () => {
      let pauseBtn = document.querySelector('#play-pause-btn');
      let username = document.querySelector('.text-nowrap[translate=no]').innerText;

      if (!document.querySelector("#steal-btn")) {
        let stealBtn = document.createElement('button');
        stealBtn.id = 'steal-btn';
        stealBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
        let margin = 92.5;
        if (hideLayers) margin -= 42.5;
        stealBtn.setAttribute('style', `width:32px;height:32px;margin-top:${margin}px!important;`)
        stealBtn.title = "Steal Skin/Cape";
        let stealIcon = document.createElement('i');
        stealIcon.classList.add('fas');
        stealIcon.classList.add('fa-user-secret');
        stealBtn.innerHTML = stealIcon.outerHTML;
        pauseBtn.outerHTML += stealBtn.outerHTML;

        document.querySelector('#steal-btn').onclick = () => {
          const queryParams = [];
          if (currentSkinId) queryParams.push(`skin=${currentSkinId}`);
          if (currentDataModel) queryParams.push(`model=${currentDataModel}`);
          if (currentCape) queryParams.push(`cape=${currentCape}`);
          if (username) queryParams.push(`username=${username}`);
          if (nmceCape) queryParams.push(`nmceCape=${nmceCape}`);
          const url = `${location.origin}/extras/skin-cape-test?${queryParams.join('&')}`;
          window.location.href = url;
        }
      }
    });
  }
}

// hide element not delete
const hideElement = (el) => {
  el.classList.add('d-none')
}

// hide hidden nh
const hideHidden = () => {
  var nameElements = document.querySelectorAll('tr');
  for (var i = 0; i < nameElements.length; i++) {
    var historyEl = nameElements[i];
    if (historyEl.classList.value === '' && historyEl.innerText.includes('—')) {
      hideElement(nameElements[i]);
      if (nameElements[i + 1] && nameElements[i + 1].classList.value !== '') {
        hideElement(nameElements[i + 1]);
      }
    }
  }
  var newHistory = document.querySelectorAll('tr:not(.d-none)');
  newHistory[newHistory.length - 1].classList.remove('border-bottom');
}

// show hidden nh
const showHidden = () => {
  var newHistory = document.querySelectorAll('tr:not(.d-none)');
  var hiddenHist = document.querySelectorAll('tr.d-none');
  newHistory[newHistory.length - 1].classList.add('border-bottom');
  hiddenHist.forEach((el) => {
    el.classList.remove('d-none');
  })
}

// fix bug
waitForFunc("updateSkin", () => {
  window.updateSkin = () => { }
});

window.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".skin-3d").id = "skin-3d";
  document.querySelector(".skin-3d").classList.remove("skin-3d");
});

if (!hideCreatedAt) {
  window.addEventListener("message", (json) => {
    if (json.origin !== 'https://gadgets.faav.top') return;
    if (typeof json.data.accountType !== 'undefined') {
      var creationDate = json.data.creationDate;

      if (creationDate !== 'null') {
        var warningCdEl = document.createElement("i")

        warningCdEl.id = "warningcd";
        warningCdEl.classList.add("fas");
        warningCdEl.classList.add("fa-exclamation-circle");

        cdate.textContent = new Date(creationDate).toLocaleDateString() + " ";
        cdate.append(warningCdEl);

        waitForTooltip(() => $('#warningcd').tooltip({
          "placement": "top",
          "boundary": "viewport",
          "title": "Creation dates are inaccurate for a lot of accounts due to a breaking change on Mojang's end. We are currently fetching dates from Ashcon's API. Please yell at Mojang (WEB-3367) in order for accurate creation dates to return."
        }))
      } else {
        cdate.textContent = 'Not Found!';
      }
    }
  });
}

waitForSelector('.order-lg-2', () => {
  var username = document.querySelector('.text-nowrap[translate=no]').innerText;

  var uuid_select = document.querySelector('#uuid-select');
  var uuid = uuid_select.children[0].innerText;

  // fix uuid select
  document.querySelector("#uuid-select").onclick = (e) => {
    if (e.pointerType === 0 || e.target.tagName === "OPTION") document.querySelector("#uuid-select").blur();
  }

  var cardBody = uuid_select.parentElement.parentElement.parentElement;
  var views = cardBody.querySelector('.card-body > :nth-child(2)');

  // create layer buttons
  setTimeout(createLayerBtn);

  document.querySelector('[style="max-width: 700px; min-height: 216px; margin: auto"]')?.remove();

  var descText = linksTextArea.toString().split('{uuid}').join(uuid).split('{username}').join(username);
  var hasMdLink = /^(?=.*\[)(?=.*\])(?=.*\()(?=.*\)).*$/.test(descText);

  if (!hasMdLink || descText.match(/["'`<>]/g)) {
    descText = `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`.toString().split('{uuid}').join(uuid);
    hasMdLink = /^(?=.*\[)(?=.*\])(?=.*\()(?=.*\)).*$/.test(descText);
  }

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

    linksTextArea = descText;
  }

  views.outerHTML += `
      ${!hideCreatedAt ? `<div class="row g-0">
        <div class="col col-lg-3"><strong>Created At</strong></div>
        <div id="cdate" class="col-auto saving"><span>•</span><span>•</span><span>•</span></div>
      </div>` : ''}
      ${linksTextArea ? `<div class="row g-0">
        <div class="col order-lg-1 col-lg-3"><strong>Links</strong></div>
        <div class="col-12 order-lg-2 col-lg">${linksTextArea}</div>
      </div>` : ''}
    `;

  // BEDROCK.LOL CAPES CONTAINER
  if (enableBedrockCapes) {
    if (bedrockOnly) document.documentElement.style.setProperty("--bedrock-only", "none");

    fetch(`https://bedrock.lol/api/v1/users/java/${uuid}`)
      .then(res => res.json())
      .then(data => {
        data.capes.sort((a, b) => b.user_count - a.user_count);
        const capeTemplates = [];
        for (let i = 0; i < data.capes.length; i++) {
          const curCape = data.capes[i];
          capeTemplates.push(new CapeTemplate("data:image/png;base64," + curCape.image_data, curCape.name, curCape.description, "/cape/bedrock/" + curCape.id, curCape.java_equivalent));
        }
        const cardHeader = document.querySelector(".card:has(.cape-2d) .card-header");
        cardHeader.innerHTML = "Java " + cardHeader.innerText;
        createCapeCard(capeTemplates, "Bedrock Capes", (() => {
          let hasBedrockOnly = document.querySelector("a[href*='/bedrock/']:not([data-java_equivalent])");
          if (bedrockOnly && !hasBedrockOnly) {
            document.documentElement.style.setProperty("--bedrock-only", "contents");
            bedrockBtn.style.display = 'none';
          }
          bedrockBtn.onclick = () => {
            if (bedrockOnly) {
              document.documentElement.style.setProperty("--bedrock-only", "contents");
              bedrockBtn.innerHTML = '<i class="fas fa-fw fa-eye-slash"></i>';
              bedrockOnly = false;
              localStorage.setItem('bedrockOnly', 'false');
            } else {
              document.documentElement.style.setProperty("--bedrock-only", "none");
              bedrockBtn.innerHTML = '<i class="fas fa-fw fa-eye"></i>';
              bedrockOnly = true;
              localStorage.setItem('bedrockOnly', 'true');
            }
          }
        }), true);
      });
  }

  // add badges
  if (!hideBadges2) {
    waitForSupabase((supabase_data) => {
      // add emoji override (if applicable)
      let emojiOverride = supabase_data.user_emoji_overrides.filter(obj => obj.uuid === uuid)[0];
      if (emojiOverride) {
        let usernameEl = document.querySelector("h1.text-nowrap");
        // if usernameEl has img child, remove it
        if (usernameEl.querySelector("img")) usernameEl.querySelector("img").remove();
        // add new img
        let emojiImg = document.createElement("img");
        emojiImg.draggable = false;
        emojiImg.src = emojiOverride.image_src;
        emojiImg.classList.add("emoji");
        emojiImg.id = "emoji_override";
        waitForTooltip(() => {
          $('#emoji_override').tooltip({
            "placement": "top",
            "boundary": "viewport",
            "title": emojiOverride.tooltip_text
          });
        });
        usernameEl.append(emojiImg);
      }

      const userBadgeIds = supabase_data.user_badges.filter(obj => obj.user === uuid).map(v => v.badge);
      if (userBadgeIds.length > 0) {
        const socialsTitle = document.querySelector(".col-lg-3.pe-3 strong");
        var hrEl = document.createElement("hr");
        hrEl.classList.add("my-1");
        if (!socialsTitle) cardBody.append(hrEl)

        const userBadges = supabase_data.badges.filter(b => userBadgeIds.includes(b.id));
        let badgeCardRange = document.createRange();
        let badgeCardHTML = badgeCardRange.createContextualFragment(`
        <div class="row g-0 align-items-center">
          <div class="col-auto col-lg-3 pe-3"><strong id="badgestitle">Badges</strong></div>
          <div class="col d-flex flex-wrap justify-content-end justify-content-lg-start" style="margin:0 -0.25rem" id="badges"></div>
        </div>
        `)
        let badgesHTML = userBadges.map(badge => {
          var badgeRange = document.createRange()
          var badgeHTML = badgeRange.createContextualFragment(`
            <a class="d-inline-block position-relative p-1" href="javascript:void(0)">
              <img class="service-icon">
            </a>
          `);

          badgeHTML.querySelector("img").src = badge.image;
          badgeHTML.querySelector("img").style["image-rendering"] = "pixelated";
          badgeHTML.querySelector("a").setAttribute("title", badge.name);
          badgeHTML.querySelector("a").href = `/extras/badge/${encodeURIComponent(badge.id)}`;

          return badgeHTML.querySelector("a").outerHTML;
        })

        badgeCardHTML.querySelector("#badges").innerHTML = badgesHTML.join("");

        cardBody.append(badgeCardHTML)

        waitForTooltip(() => {
          $('#badgestitle').tooltip({
            "placement": "top",
            "boundary": "viewport",
            "title": "Badges from NameMC Extras!"
          })

          $('[src*=badges]').parent().tooltip({
            "placement": "top",
            "boundary": "viewport"
          });
        })
      }
    });
  }

  // replace (edit) and Copy with icons
  var editLinks = [...document.querySelectorAll("a[href*='/my-profile/switch']:not([class])")];
  editLinks.forEach(editLink => {
    editLink.previousSibling.textContent = editLink.previousSibling.textContent.slice(0, -1);
    editLink.nextSibling.textContent = editLink.nextSibling.textContent.slice(1);
    editLink.innerHTML = '<i class="far fa-fw fa-edit"></i>';
    editLink.classList.add("color-inherit");
    editLink.title = "Edit";

    // move to far right
    if (editLink.parentElement.tagName === "STRONG") {
      editLink.parentElement.parentElement.append(editLink);
      editLink.parentElement.style.cssText = "display:flex;justify-content:space-between";
    }
  });

  var gadgetIf = document.createElement('iframe');
  gadgetIf.width = 0;
  gadgetIf.height = 0;
  gadgetIf.style.display = 'none';
  gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}?url=${location.href}`;
  gadgetIf.onload = () => {
    gadgetIf.remove();
  };

  document.documentElement.append(gadgetIf);

  // give developers verification
  if (uuid === '1cf1a286-acbd-4810-8137-0fcd7a0969f2' || uuid === 'd76ca44e-af76-41ad-8b24-d012673ac436') {
    [...document.querySelectorAll(".service-icon:not([src*=badges])")].forEach(el => {
      var verifyEl = document.createElement("img");
      verifyEl.width = 15;
      verifyEl.height = 15;
      verifyEl.className = 'position-absolute bottom-0 end-0';
      verifyEl.src = 'https://s.namemc.com/img/verification-badge.svg';
      verifyEl.title = "Verified";
      el.parentElement.appendChild(verifyEl);
    })
  }

  waitForSVSelector('.skin-2d.skin-button', () => {
    setTimeout(createStealBtn);

    var skins = [...document.querySelectorAll(".skin-2d.skin-button")]
    var hasMultipleSkins = skins.length > 1;
    if (hasMultipleSkins) {
      const skinsContainer = document.querySelector('.skin-2d.skin-button').parentElement.parentElement;
      var skinsTitle = skinsContainer.parentElement.parentElement.querySelector('.card-header');
      var skinEdit = skinsTitle.querySelector(".fa-edit");

      skinsTitle.innerHTML += `<div>
          <a href="javascript:void(0)" id="skinArtBtn" class="color-inherit" title="Download Skin Art"><i class="fas fa-fw fa-arrow-alt-to-bottom"></i></a>
          <a href="javascript:void(0)" id="borderBtn" class="color-inherit" title="Show/Hide Borders">
            ${skinArt ? '<i class="far fa-fw fa-border-all">' : '<i class="far fa-fw fa-border-style">'}</i>
          </a>
          ${skinEdit ? skinEdit?.parentElement?.outerHTML : ""}
        </div>`;

      skinsTitle.querySelector(".fa-edit")?.parentElement?.remove()

      skinsTitle.style.cssText = "display:flex;justify-content:space-between";

      waitForImage(() => {
        var resizedArt = document.createElement("canvas");
        resizedArt.id = "resizedArt";
        resizedArt.width = 72;
        resizedArt.height = 24;
        resizedArt.style.display = "none";

        document.body.append(resizedArt)

        var skinArtCanvas = document.createElement("canvas");
        skinArtCanvas.id = "skinArtImage";
        skinArtCanvas.width = rows * size;
        skinArtCanvas.height = columns * size;
        skinArtCanvas.style.display = "none";

        document.body.append(skinArtCanvas)

        var ctx = skinArtImage.getContext("2d");
        var skinArtImages = []

        skins.forEach((skin) => {
          var img = new Image();
          img.onload = () => {
            skinArtImages.push(img)

            if (skinArtImages.length === skins.length) {
              for (let i = 0; i < skinArtImages.length; i += rows) {
                const chunk = skinArtImages.slice(i, i + rows);
                chunk.forEach((image, j, array) => {
                  if (array.length === rows) {
                    ctx.drawImage(image, size * j, size * (i / rows))
                  } else {
                    var padding = ((rows - array.length) / 2) * size
                    ctx.drawImage(image, padding + (size * j), size * (i / rows))
                  }
                })
              }
            }

            if (skins.length === skinArtImages.length) {
              var rectx = resizedArt.getContext("2d");

              var img2 = new Image();
              img2.onload = () => {
                rectx.drawImage(img2, 0, 0, 72, 24);
                skinArtBtn.onclick = downloadSkinArt;
              }

              img2.src = skinArtImage.toDataURL();
            }
          };

          img.src = skin.toDataURL();
        });
      }, skins.at(-1).getAttribute("data-id"))

      if (skinArt) {
        skinsContainer.style.width = '312px';
        skinsContainer.style.margin = '6px auto';
        document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
          skin.classList.add('skinart');
        });
      }

      borderBtn.onclick = () => {
        if (skinArt === false) {
          skinsContainer.style.width = '312px';
          skinsContainer.style.margin = '6px auto';
          document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
            skin.classList.add('skinart');
          });
          skinArt = true;
          localStorage.setItem("skinArt", "true");
          borderBtn.innerHTML = '<i class="far fa-fw fa-border-all">';
        } else {
          skinsContainer.style.width = '324px';
          skinsContainer.style.margin = 'auto';
          document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
            skin.classList.remove('skinart');
          });
          skinArt = false;
          localStorage.setItem("skinArt", "false");
          borderBtn.innerHTML = '<i class="far fa-fw fa-border-style">';
        }
      }
    }
  })

  setTimeout(() => {
    var historyTitle = document.querySelectorAll('.card-header')[1];
    historyTitle.style.cssText = "display:flex;justify-content:space-between";

    var hasHidden = [...document.querySelectorAll('tr')].filter(el => el.innerText.includes('—')).length !== 0;
    if (hasHidden) {
      if (isHidden) hideHidden();

      // add show hidden button
      historyTitle.innerHTML += `<div id="historyButtons">
          <a href="javascript:void(0)" class="color-inherit" title="Show/Hide Hidden Names" id="histBtn">
            ${isHidden ? '<i class="fas fa-fw fa-eye"></i>' : '<i class="fas fa-fw fa-eye-slash"></i>'}
          </a>
          <a href="javascript:void(0)" class="color-inherit copy-button" data-clipboard-text="${[...historyTitle.parentElement.querySelectorAll('tr:not(.d-none):not(.d-lg-none)')].map(a => a.innerText.split("\t")[0] + " " + a.innerText.split("\t")[1]).join("\n")}" id="copyHist"><i class="far fa-fw fa-copy"></i></a>
          ${historyTitle.querySelector(".fa-edit") ? historyTitle.querySelector(".fa-edit")?.parentElement?.outerHTML : ""}
        </div>`;

      histBtn.onclick = () => {
        if (isHidden === true) {
          showHidden();
          isHidden = false;
          localStorage.setItem("isHidden", "false");
          copyHist.setAttribute("data-clipboard-text", [...historyTitle.parentElement.querySelectorAll('tr:not(.d-none):not(.d-lg-none)')].map(a => a.innerText.split("\t")[0] + " " + a.innerText.split("\t")[1]).join("\n"));
          histBtn.innerHTML = '<i class="fas fa-fw fa-eye-slash"></i>';
        } else {
          hideHidden();
          isHidden = true;
          localStorage.setItem("isHidden", "true");
          copyHist.setAttribute("data-clipboard-text", [...historyTitle.parentElement.querySelectorAll('tr:not(.d-none):not(.d-lg-none)')].map(a => a.innerText.split("\t")[0] + " " + a.innerText.split("\t")[1]).join("\n"));
          histBtn.innerHTML = '<i class="fas fa-fw fa-eye"></i>';
        }
      }
    } else {
      historyTitle.innerHTML += `<div id="historyButtons">
          <a href="javascript:void(0)" class="color-inherit copy-button" data-clipboard-text="${[...historyTitle.parentElement.querySelectorAll('tr:not(.d-none):not(.d-lg-none)')].map(a => a.innerText.split("\t")[0] + " " + a.innerText.split("\t")[1]).join("\n")}" id="copyHist"><i class="far fa-fw fa-copy"></i></a>
          ${historyTitle.querySelector(".fa-edit") ? historyTitle.querySelector(".fa-edit")?.parentElement?.outerHTML : ""}
        </div>`;
    }

    const moveBtn = (btn) => {
      document.getElementById("historyButtons").append(btn);
    }

    var removeAllBtn = historyTitle.querySelector(".fa-trash")?.parentElement;
    if (removeAllBtn) {
      // check type
      if (removeAllBtn && typeof removeAllBtn.onclick !== "undefined" && removeAllBtn.onclick) {
        var removeOnClick = removeAllBtn.onclick;
        moveBtn(removeAllBtn);
        document.querySelector("#historyButtons").lastElementChild.onclick = removeOnClick;
      } else {
        if (removeAllBtn.parentElement.tagName === "FORM") {
          moveBtn(removeAllBtn.parentElement);
        } else if (removeAllBtn.parentElement.parentElement.tagName === "FORM") {
          moveBtn(removeAllBtn.parentElement.parentElement);
        } else if (removeAllBtn.parentElement.parentElement.parentElement.tagName === "FORM") {
          moveBtn(removeAllBtn.parentElement.parentElement.parentElement);
        } else if (removeAllBtn.parentElement.parentElement.parentElement.parentElement.tagName === "FORM") {
          moveBtn(removeAllBtn.parentElement.parentElement.parentElement.parentElement);
        } else {
          moveBtn(removeAllBtn);
        }
      }
    }

    // fix alignment
    document.querySelectorAll("a.px-1").forEach(a => a.classList.remove("px-1"))

    // fix title
    setTimeout(() => copyHist.title = "Copy", 1000)

    // make it so when holding shift and copy is copies name changes instead
    window.addEventListener("keydown", (event) => event.shiftKey ? copyHist.setAttribute("data-clipboard-text", [...historyTitle.parentElement.querySelectorAll('tr:not(.d-lg-none)')].length - 1) : null)
    window.addEventListener("keyup", () => copyHist.setAttribute("data-clipboard-text", [...historyTitle.parentElement.querySelectorAll('tr:not(.d-none):not(.d-lg-none)')].map(a => a.innerText.split("\t")[0] + " " + a.innerText.split("\t")[1]).join("\n")))

    historyTitle.querySelector(".fa-edit")?.parentElement?.remove();
  });

  waitForSVSelector('#skin-3d', () => {
    const oldContainer = document.querySelector('#skin-3d');
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

    const skinContainer = document.querySelector('#skin_container');
    let skinViewer = new skinview3d.SkinViewer({
      canvas: skinContainer,
      width: 276,
      height: 368,
      skin: null,
      preserveDrawingBuffer: true
    });

    skinViewer.controls.enableRotate = true;
    skinViewer.controls.enableZoom = false;
    skinViewer.controls.enablePan = false;

    skinViewer.animation = new skinview3d.WalkingAnimation();
    skinViewer.animation.speed = 0.5;
    skinViewer.animation.paused = paused;
    skinViewer.animation.headBobbing = false;

    window.skinViewer = skinViewer;

    skinViewer.fov = 40;
    skinViewer.camera.position.y = 22 * Math.cos(.01);
    skinViewer.playerWrapper.rotation.y = .53;
    skinViewer.globalLight.intensity = .65;
    skinViewer.cameraLight.intensity = .38;
    skinViewer.cameraLight.position.set(12, 25, 0);

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

    var skinHash = skinContainer.getAttribute('data-skin-hash');
    var capeHash = skinContainer.getAttribute('data-cape-hash');
    var model = skinContainer.getAttribute('data-model');
    var hasEars = false;
    var optifineSelected = document.querySelector('a[href*="optifine.net/banners"] .skin-button-selected');

    waitForImage(async () => {
      // has ears
      if (uuid === "1e18d5ff-643d-45c8-b509-43b8461d8614") hasEars = true;

      // load skin
      currentSkinId = skinHash;
      currentDataModel = model;
      skinViewer.loadSkin(window.namemc.images[skinHash].src, {
        ears: hasEars,
        model: model
      })

      // load cape
      if (capeHash !== '') {
        waitForImage(async () => {
          currentCape = capeHash;
          nmceCape = false;
          if (!(hideOptifine && optifineSelected)) await skinViewer.loadCape(window.namemc.images[capeHash].src);

          setTimeout(createElytraBtn);
        }, capeHash);
      }

      waitForSupabase(async (supabase_data) => {
        const userCapeIds = supabase_data.user_capes.filter(obj => obj.user === uuid).filter(obj => typeof obj.equipped === "undefined" || obj.equipped === true).map(v => v.cape);
        if (userCapeIds.length > 0) {
          document.querySelectorAll('.cape-2d').forEach((el) => {
            el.classList.remove('skin-button-selected');
          });

          const userCapes = supabase_data.capes.filter(b => userCapeIds.includes(b.id));
          await skinViewer.loadCape(userCapes[0].image_src);
          currentCape = userCapes[0].id;
          nmceCape = true;

          setTimeout(createElytraBtn);
        }
      });

      // upside down gang
      if (username === "Dinnerbone" || username === "Grumm") {
        skinViewer.playerWrapper.rotation.z = Math.PI;
      }

      // deadmau5 ears
      if (hasEars === true) {
        skinViewer.playerWrapper.translateY(-3); // move player down
        skinViewer.zoom = 0.76; // zoom out
      } else {
        skinViewer.zoom = 0.86;
      }

      // make layer button work
      if (!hideLayers) document.querySelector("#layer-btn").onclick = toggleLayers;

      // skins
      document.querySelectorAll('.skin-2d').forEach((el) => {
        el.onmouseover = () => {
          document.querySelectorAll('.skin-2d').forEach((el) => {
            el.classList.remove('skin-button-selected');
          });
          el.classList.add('skin-button-selected');
          waitForImage(() => {
            currentSkinId = el.getAttribute('data-id');
            currentDataModel = el.getAttribute('data-model');
            skinViewer.loadSkin(window.namemc.images[currentSkinId].src, {
              model: currentDataModel
            });
          }, el.getAttribute('data-id'));
        }
      });

      // fix pause button
      setTimeout(fixPauseBtn, 1000);

      // capes
      document.querySelectorAll('.cape-2d').forEach((el) => {
        el.onmouseover = () => {
          document.querySelectorAll('.cape-2d').forEach((el) => {
            el.classList.remove('skin-button-selected');
          });
          el.classList.add('skin-button-selected');
          currentCape = el.getAttribute('data-cape');
          nmceCape = false;
          waitForImage(() => {
            if (elytraOn === true) {
              skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src, {
                backEquipment: "elytra"
              });
            } else {
              skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src);
            }
            setTimeout(createElytraBtn);
          }, el.getAttribute('data-cape'));
          setTimeout(fixPauseBtn);
        }
      });
    }, skinHash);
  });
});