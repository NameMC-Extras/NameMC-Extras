/* copyright 2024 | Faav#6320 | github.com/bribes */

// only use for getting animate cookie
function getCookie(name) {
  let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
  return cookies[name];
}

function endsWithNumber(str) {
  return /[0-9]+$/.test(str);
}

const rows = 9
const columns = 3
const size = 32
var paused = (getCookie("animate") === "false");
var elytraOn = false;
var isHidden = true;
var skinArt = false;
var layer = true;

if (endsWithNumber(location.pathname) && location.pathname) {
  const waitForSelector = function (selector, callback) {
    if (document.querySelector(selector)) {
      callback();
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

  const waitForTooltip = function (callback) {
    if (typeof $ != 'undefined' && typeof $().tooltip != 'undefined') {
      callback();
    } else {
      setTimeout(function () {
        waitForTooltip(callback);
      });
    }
  };

  const downloadSkinArt = () => {
    var a = document.createElement("a");
    a.href = skinArtImage.toDataURL();
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
  const createLayerBtn = () => {
    waitForSelector('#play-pause-btn', () => {
      var pauseBtn = document.querySelector('#play-pause-btn');
      var layerBtn = document.createElement('button');
      layerBtn.id = 'layer-btn';
      layerBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
      layerBtn.classList.add('p-0');
      layerBtn.setAttribute('style', 'width:32px;height:32px;margin-top:50px!important;')
      layerBtn.title = "No Layers";
      layerIcon = document.createElement('i');
      layerIcon.classList.add('fas');
      layerIcon.classList.add('fa-clone');
      layerBtn.innerHTML = layerIcon.outerHTML;
      pauseBtn.outerHTML += layerBtn.outerHTML;
    });
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
        elytraBtn.setAttribute('style', 'width:32px;height:32px;margin-top:92.5px!important;')
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

  // hide element not delete
  const hideElement = (el) => {
    el.classList.add('d-none')
  }

  // hide hidden nh
  const hideHidden = () => {
    var nameElements = document.querySelectorAll('tr');
    for (var i = 0; i < nameElements.length; i++) {
      var historyEl = nameElements[i];
      if (historyEl.classList.value == '' && historyEl.innerText.includes('—')) {
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
    updateSkin = () => { }
  })

  waitForFunc("animateSkin", () => {
    animateSkin = () => { }
  })

  window.addEventListener("message", (json) => {
    if (json.origin !== 'https://gadgets.faav.top') return;
    if (typeof json.data.accountType !== 'undefined') {
      var creationDate = json.data.creationDate;
      var accountType = json.data.accountType;
      var tooltip = json.data.tooltip;
      acctype.innerHTML = `<tooltip>${accountType}</tooltip> <i id="warningacc" class="fas fa-exclamation-circle"></i>`;
      waitForTooltip(() => {
        $('#acctype tooltip').tooltip({
          "placement": "top",
          "boundary": "viewport",
          "title": tooltip
        });
        $('#warningacc').tooltip({
          "placement": "top",
          "boundary": "viewport",
          "title": "Due to the removal of the name history API this may be inaccurate."
        });
      })
      if (creationDate !== 'null') {
        cdate.innerHTML = `${new Date(creationDate).toLocaleDateString()} <i id="warningcd" class="fas fa-exclamation-circle"></i>`;
        waitForTooltip(() => $('#warningcd').tooltip({
          "placement": "top",
          "boundary": "viewport",
          "title": "Creation dates are inaccurate for a lot of accounts due to a breaking change on Mojang's end. We are currently fetching dates from Ashcon's API. Please yell at Mojang (WEB-3367) in order for accurate creation dates to return."
        }))
      } else {
        cdate.innerHTML = 'Not Found!';
      }
    }
  });

  waitForSelector('.order-lg-2', async () => {
    var username = document.querySelector('.text-nowrap[translate=no]').innerText;
    var uuid = document.querySelector('.order-lg-2').innerText;
    var views = document.querySelector('.card-body > :nth-child(3)');

    // create layer button
    createLayerBtn()

    document.querySelector('[style="max-width: 700px; min-height: 216px; margin: auto"]')?.remove()

    views.outerHTML += `
      <div class="row g-0">
        <div class="col col-lg-3"><strong>Created As</strong></div>
        <div id="acctype" class="col-auto saving"><span>•</span><span>•</span><span>•</span></div>
      </div>
      <div class="row g-0">
        <div class="col col-lg-3"><strong>Created At</strong></div>
        <div id="cdate" class="col-auto saving"><span>•</span><span>•</span><span>•</span></div>
      </div>
      <div class="row g-0">
        <div class="col order-lg-1 col-lg-3"><strong>Links</strong></div>
        <div class="col-12 order-lg-2 col-lg"><a href="https://mcuserna.me/${uuid}" target="_blank">mcuserna.me</a>, <a href="https://capes.me/${uuid}" target="_blank">capes.me</a>, <a href="https://laby.net/@${uuid}" target="_blank">LABY</a>, <a href="https://livzmc.net/user/${uuid}" target="_blank">Livz</a>, <a href="https://plancke.io/hypixel/player/stats/${uuid}" target="_blank">Plancke</a>, <a href="https://crafty.gg/players/${uuid}" target="_blank">Crafty</a></div>
      </div>
    `;
    var gadgetIf = document.createElement('iframe');
    gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}?url=${location.href}`;
    gadgetIf.id = 'nmcIf';
    gadgetIf.onload = () => {
      gadgetIf.remove();
    };

    document.body.append(gadgetIf);

    // add legendarisk clown emoji and remove verification
    if (uuid == '55733f30-8907-4851-8af3-420f6f255856' || uuid == '0dd649c1-40c7-47f5-a839-0b98eaefedf2' || uuid == '70296d53-9fc3-4e53-97eb-269e97f14aad') {
      document.querySelector('h1 .emoji').src = 'https://s.namemc.com/img/emoji/twitter/1f921.svg';
      document.querySelectorAll('[title=Verified]').forEach(el => el.remove());
    }

    waitForSVSelector('.skin-2d.skin-button', () => {
      var skins = [...document.querySelectorAll(".skin-2d.skin-button")]
      var hasMultipleSkins = skins.length > 1;
      if (hasMultipleSkins) {
        const skinsContainer = document.querySelector('.skin-2d.skin-button').parentElement.parentElement;
        var skinsTitle = skinsContainer.parentElement.parentElement.querySelector('.card-header');
        skinsTitle.querySelector("strong").innerHTML += ' (<a href="javascript:void(0)" id="borderBtn">hide borders</a>)';
        skinsTitle.style.cssText = "display:flex;justify-content:space-between";
        skinsTitle.innerHTML += '<a href="javascript:void(0)" id="skinArtBtn" style="color:white"><i class="fas fa-arrow-alt-to-bottom"></i></a>';

        waitForImage(() => {
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

              if (skinArtImages.length == skins.length) {
                for (let i = 0; i < skinArtImages.length; i += rows) {
                  const chunk = skinArtImages.slice(i, i + rows);
                  console.log(i)
                  console.log(chunk)
                  chunk.forEach((image, j, array) => {
                    if (array.length == rows) {
                      ctx.drawImage(image, size * j, size * (i / rows))
                    } else {
                      var padding = ((rows - array.length) / 2) * size
                      ctx.drawImage(image, padding + (size * j), size * (i / rows))
                    }
                  })
                }
              }
            };

            img.src = skin.toDataURL();
          })

          skinArtBtn.onclick = downloadSkinArt;
        }, skins.at(-1).getAttribute("data-id"))

        borderBtn.onclick = () => {
          if (skinArt == false) {
            skinsContainer.style.width = '312px'
            skinsContainer.style.margin = '6px auto'
            document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
              skin.classList.add('skinart');
            })
            skinArt = true;
            borderBtn.innerHTML = 'show borders';
          } else {
            skinsContainer.style.width = '324px';
            skinsContainer.style.margin = 'auto';
            document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
              skin.classList.remove('skinart');
            })
            skinArt = false;
            borderBtn.innerHTML = 'hide borders';
          }
        }
      }
    })

    setTimeout(() => {
      var hasHidden = [...document.querySelectorAll('tr')].filter(el => el.innerText.includes('—')).length !== 0;
      if (hasHidden) {
        hideHidden();

        // add show hidden button
        var historyTitle = document.querySelectorAll('.card-header')[1]
        historyTitle.innerHTML += ' (<a href="javascript:void(0)" id="histBtn">show hidden</a>)';

        histBtn.onclick = () => {
          if (isHidden == true) {
            showHidden();
            isHidden = false;
            histBtn.innerHTML = 'hide hidden';
          } else {
            hideHidden();
            isHidden = true;
            histBtn.innerHTML = 'show hidden';
          }
        }
      }
    });

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
        skinViewer.playerObject.skin.leftArm.rotation.x = 0.33
        skinViewer.playerObject.skin.rightArm.rotation.x = -0.33

        skinViewer.playerObject.skin.leftLeg.rotation.x = -0.33
        skinViewer.playerObject.skin.rightLeg.rotation.x = 0.33
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
      waitForImage(async () => {
        // has ears
        if (uuid == "1e18d5ff-643d-45c8-b509-43b8461d8614") hasEars = true;

        // load skin
        skinViewer.loadSkin(window.namemc.images[skinHash].src, {
          ears: hasEars,
          model: model
        })

        // load cape
        if (capeHash !== '') {
          waitForImage(() => {
            skinViewer.loadCape(window.namemc.images[capeHash].src);
            setTimeout(createElytraBtn);
          }, capeHash);
        }

        // upside down gang
        if (username === "Dinnerbone" || username === "Grumm") {
          skinViewer.playerWrapper.rotation.z = Math.PI;
        }

        // deadmau5 ears
        if (hasEars == true) {
          skinViewer.playerWrapper.translateY(-3); // move player down
          skinViewer.zoom = 0.76; // zoom out
        } else {
          skinViewer.zoom = 0.86;
        }

        // make layer button work
        document.querySelector("#layer-btn").onclick = toggleLayers;

        // fix pause button
        fixPauseBtn()

        // skins
        document.querySelectorAll('.skin-2d').forEach((el) => {
          el.onmouseover = () => {
            document.querySelectorAll('.skin-2d').forEach((el) => {
              el.classList.remove('skin-button-selected');
            });
            el.classList.add('skin-button-selected');
            waitForImage(async () => {
              skinViewer.loadSkin(window.namemc.images[el.getAttribute('data-id')].src);
            }, el.getAttribute('data-id'));
          }
        });

        // capes
        document.querySelectorAll('.cape-2d').forEach((el) => {
          el.onmouseover = () => {
            document.querySelectorAll('.cape-2d').forEach((el) => {
              el.classList.remove('skin-button-selected');
            });
            el.classList.add('skin-button-selected');
            waitForImage(async () => {
              if (elytraOn == true) {
                skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src, {
                  backEquipment: "elytra"
                });
              } else {
                skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src);
              }
              createElytraBtn();
            }, el.getAttribute('data-cape'));
            fixPauseBtn();
          }
        });

        const userCustomCapes = await getUserCapes(uuid);
        const notMarcOrLucky = uuid != "b0588118-6e75-410d-b2db-4d3066b223f7" || Math.random() * 10 < 1;
        if (userCustomCapes.length > 0 && notMarcOrLucky) {
          skinViewer.loadCape(userCustomCapes[0].src);
        }

      }, skinHash);
    });
  });
}
