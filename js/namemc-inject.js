/* copyright 2022 | Faav#6320 | github.com/bribes */
function endsWithNumber(str) {
  return /[0-9]+$/.test(str);
}

var paused = false;
var elytraOn = false;

if (endsWithNumber(location.pathname) && location.pathname) {
  const waitForUUID = function (callback) {
    if (document.querySelector('.order-lg-2')) {
      callback();
    } else {
      setTimeout(function () {
        waitForUUID(callback);
      }, 1);
    }
  };

  const waitForViewer = function (callback) {
    if (document.querySelector('.skin-3d')) {
      callback();
    } else {
      setTimeout(function () {
        waitForViewer(callback);
      }, 1);
    }
  };

  const waitForPauseBtn = function (callback) {
    if (document.querySelector('#play-pause-btn')) {
      callback();
    } else {
      setTimeout(function () {
        waitForPauseBtn(callback);
      }, 1);
    }
  };

  const waitForSkin = function (callback, skin) {
    if (typeof window.namemc !== 'undefined' && typeof window.namemc.images !== 'undefined' && typeof window.namemc.images[skin] !== 'undefined') {
      callback();
    } else {
      setTimeout(function () {
        waitForSkin(callback, skin);
      }, 1);
    }
  };

  // add elytra button
  const createElytraBtn = () => {
    waitForPauseBtn(() => {
      var pauseBtn = document.querySelector('#play-pause-btn');
      if (skinViewer.capeTexture !== null) {
        var elytraBtn = document.createElement('button');
        elytraBtn.id = 'elytra-btn';
        elytraBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 right-0 m-2 p-0')
        elytraBtn.classList.add('p-0');
        elytraBtn.setAttribute('style', 'width:32px;height:32px;margin-top:50px!important;')
        elytraIcon = document.createElement('i');
        elytraIcon.classList.add('fas');
        elytraIcon.classList.add('fa-dove');
        elytraBtn.innerHTML = elytraIcon.outerHTML;
        pauseBtn.outerHTML += elytraBtn.outerHTML;

        document.querySelector('#elytra-btn').onclick = () => {
          var pauseIconEl = document.querySelector('#elytra-btn').querySelector('i');
          if (elytraOn == false) {
            elytraOn = true;
            pauseIconEl.classList.remove('fa-dove');
            pauseIconEl.classList.add('fa-square');
            skinViewer.loadCape(skinViewer.capeCanvas.toDataURL(), {
              backEquipment: "elytra"
            });
          } else {
            elytraOn = false;
            pauseIconEl.classList.remove('fa-square');
            pauseIconEl.classList.add('fa-dove');
            skinViewer.loadCape(skinViewer.capeCanvas.toDataURL());
          }
        }
      } 
    });
  }

  window.addEventListener("message", (json) => {
    if (json.origin !== 'https://gadgets.faav.top') return;
    if (typeof json.data.accountType !== 'undefined') {
      var creationDate = json.data.creationDate;
      var accountType = json.data.accountType;
      var tooltip = json.data.tooltip;
      acctype.innerHTML = accountType;
      $('#acctype').tooltip({"placement":"top","boundary":"viewport","title":tooltip});
      if (creationDate !== 'null') {
        cdate.innerHTML = `${new Date(creationDate).toLocaleDateString()} <i id="warningcd" class="fas fa-exclamation-circle"></i>`;
        $('#warningcd').tooltip({"placement":"top","boundary":"viewport","title":"Creation dates are inaccurate for a lot of accounts due to a breaking change on Mojang's end. We are currently fetching dates from Ashcon's API. Please yell at Mojang (WEB-3367) in order for accurate creation dates to return."});
      } else {
        cdate.innerHTML = 'Not Found!';
      }
    }
  });

  waitForUUID(async () => {
    var username = document.querySelector('.text-nowrap[translate=no]').innerText;
    var uuid = document.querySelector('.order-lg-2').innerText;
    var views = document.querySelector('.card-body > :nth-child(3)');

    views.outerHTML += `
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Account Type</strong></div>
    <div id="acctype" class="col-auto">Loading... <i class="fal fa-spinner icon-spin"></i></div>
  </div>
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Creation Date</strong></div>
    <div id="cdate" class="col-auto">Loading... <i class="fal fa-spinner icon-spin"></i></div>
  </div>
  <div class="row no-gutters">
    <div class="col order-lg-1 col-lg-4"><strong>Links</strong></div>
    <div class="col-12 order-lg-2 col-lg"><a href="https://mcuserna.me/${uuid}" target="_blank">mcuserna.me</a>, <a href="https://capes.me/${uuid}" target="_blank">capes.me</a>, <a href="https://laby.net/${uuid}" target="_blank">LABY.net</a>, <a href="https://livzmc.net/user/${uuid}" target="_blank">LivzMC</a></div>
  </div>
  `

    var gadgetIf = document.createElement('iframe');
    gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}?url=${location.href}`;
    gadgetIf.id = 'nmcIf';

    document.body.append(gadgetIf);
    
    // add legendarisk clown emoji and remove verification
    if (uuid == '55733f30-8907-4851-8af3-420f6f255856' || uuid == '0dd649c1-40c7-47f5-a839-0b98eaefedf2' || uuid == '70296d53-9fc3-4e53-97eb-269e97f14aad') {
      document.querySelector('h1 .emoji').src = 'https://s.namemc.com/img/emoji/twitter/1f921.svg';
      document.querySelectorAll('[title=Verified]').forEach(el => el.remove());
    }

    waitForViewer(async() => {
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
    
      let control = skinview3d.createOrbitControls(skinViewer);

      control.enableRotate = true;
      control.enableZoom = false;
      control.enablePan = false;
    
      let walk = skinViewer.animations.add(skinview3d.WalkingAnimation);
      walk.speed = 0.5;
      walk.paused = false;
    
      skinViewer.animations.paused = false;
      window.skinViewer = skinViewer;
      window.control = control;
      window.walk = walk;
  
      skinViewer.zoom = 0.85;
      skinViewer.fov = 20;
      skinViewer.playerWrapper.rotation.y = 0.52;
    
      skinContainer.addEventListener(
        "contextmenu",
        (event) => event.stopImmediatePropagation(),
        true
      );

      var skinHash = skinContainer.getAttribute('data-skin-hash');
      var capeHash = skinContainer.getAttribute('data-cape-hash');
      var model = skinContainer.getAttribute('data-model');
      var hasEars = false;
      waitForSkin(async () => {
        // has ears
        if (uuid == "1e18d5ff-643d-45c8-b509-43b8461d8614") hasEars = true;

        // load skin
        skinViewer.loadSkin(window.namemc.images[skinHash].src, {
          ears: hasEars,
          model: model
        })

        // load cape
        if (capeHash !== '') {
          skinViewer.loadCape(window.namemc.images[capeHash].src);
          setTimeout(createElytraBtn, 1)
        }

        // upside down gang
        if (username === "Dinnerbone" || username === "Grumm") {
          skinViewer.playerWrapper.rotation.z = Math.PI;
        }

        // deadmau5 ears
        if (hasEars == true) {
          skinViewer.playerWrapper.translateY(-3); // move player down
          skinViewer.zoom = 0.75; // zoom out
        }

        // skins
        document.querySelectorAll('.skin-2d').forEach((el) => {
          el.onmouseover = () => {
            document.querySelectorAll('.skin-2d').forEach((el) => {
              el.classList.remove('skin-button-selected');
            });
            el.classList.add('skin-button-selected');
            waitForSkin(async () => {
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
            waitForSkin(async () => {
              if (elytraOn == true) {
                skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src, {
                  backEquipment: "elytra"
                });
              } else {
                skinViewer.loadCape(window.namemc.images[el.getAttribute('data-cape')].src);
              }
              createElytraBtn();
            }, el.getAttribute('data-cape'));
          }
        });

        // fix pause button
        setTimeout(() => {
          var pauseBtn = document.querySelector('#play-pause-btn');
          var pauseIcon = pauseBtn.querySelector('i');
          pauseIcon.classList.remove('fa-play');
          pauseIcon.classList.add('fa-pause');
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
            walk.paused = paused;
          }    
        }, 1)
      }, skinHash);
    });
  });
}
