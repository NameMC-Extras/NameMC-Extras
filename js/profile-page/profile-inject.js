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

if (location.pathname.split("-").length >= 5 || endsWithNumber(location.pathname) && location.pathname) {
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
        waitForSelector(selector, callback);
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
    if (window[func]) {
      setTimeout(() => {
        callback();
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

  // add layer button
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
      var tooltipEl = document.createElement("tooltip");
      var warningAccEl = document.createElement("i");

      tooltipEl.textContent = accountType + " ";

      warningAccEl.id = "warningacc";
      warningAccEl.classList.add("fas");
      warningAccEl.classList.add("fa-exclamation-circle");

      acctype.innerHTML = tooltipEl.outerHTML + warningAccEl.outerHTML;

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

  waitForSelector('.order-lg-2', () => {
    var username = document.querySelector('.text-nowrap[translate=no]').innerText;
    var uuid = document.querySelector('.order-lg-2').innerText;
    var views = document.querySelector('.card-body > :nth-child(3)');
    var cardBody = document.querySelector('.card-body');

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

    // add badges
    waitForSupabase((supabase_data) => {
      const userBadgeIds = supabase_data.user_badges.filter(obj => obj.user == uuid).map(v => v.badge);
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
          badgeHTML.querySelector("a").href = encodeURI(`/extras/badge/${badge.id}`);

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

      // add emoji override (if applicable)
      let emojiOverride = supabase_data.user_emoji_overrides.filter(obj => obj.uuid == uuid)[0];
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
    });

    var gadgetIf = document.createElement('iframe');
    gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}?url=${location.href}`;
    gadgetIf.id = 'nmcIf';
    gadgetIf.onload = () => {
      gadgetIf.remove();
    };

    document.body.append(gadgetIf);

    // give developers verification
    if (uuid == '2ce90d65-f253-4e3c-8e4b-3d5fb1e4c927' || uuid == '88e152f3-e545-4681-8cec-3e8f85175902') {
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
            borderBtn.textContent = 'show borders';
          } else {
            skinsContainer.style.width = '324px';
            skinsContainer.style.margin = 'auto';
            document.querySelectorAll('.skin-2d.skin-button').forEach(skin => {
              skin.classList.remove('skinart');
            })
            skinArt = false;
            borderBtn.textContent = 'hide borders';
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
            histBtn.textContent = 'hide hidden';
          } else {
            hideHidden();
            isHidden = true;
            histBtn.textContent = 'show hidden';
          }
        }
      }
    });

    waitForSVSelector('.skin-3d', () => {
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
      waitForImage(() => {
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
            waitForSupabase((supabase_data) => {
              const userCapeIds = supabase_data.user_capes.filter(obj => obj.user == uuid).map(v => v.cape);
              const notMarcOrLucky = uuid != "b0588118-6e75-410d-b2db-4d3066b223f7" || Math.random() * 10 < 1;

              if (userCapeIds.length > 0 && notMarcOrLucky) {
                const userCapes = supabase_data.capes.filter(b => userCapeIds.includes(b.id));
                skinViewer.loadCape(userCapes[0].image_src)
              }
            })
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
            waitForImage(() => {
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
            waitForImage(() => {
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
      }, skinHash);
    });
  });
}
