// only use for getting animate cookie
function getCookie(name) {
    let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
    return cookies[name];
}

var paused = (getCookie("animate") === "false");
var elytraOn = false;
var layer = true;
var currentCape = null;
var currentOptifineMode = "steal";
var officialCapes = {};
var officialCapesCategoryOrder = [];
var specialCapes = {};
const noElytra = [
    "fd14214cd8073059e93d9c626260f5df85e5a959181537119df56cadaf5002cc",
    "2ada7acf3e0ef436f350e21af91a774b7cd95309c53668a441eeacec88ca4211",
    "d1f20f8534f9f58a3a0a26586d5615f513add564809986334b7f247593425ee3",
    "938155dd83118a3993a22579649fab313cdb06073029c3839843d58fad06ebb2",
    "4e25998e4db8e19fe4df3df74d7983f03ff81a4074426252ce6eb3d1c70c9a59",
    "dc39d8eb38419f4cbb9a2e19642893b854c131a9ab06bd4e2c2a5b3af98f3a19",
    "35d9516769099ad42be14344551f9e9dfe66ee9ceb1d5624b4442f76cef9ea9e",
    "da01a74f8ca96bdf652ad3acddc886d6396eea482870ed3d2678e07cd1cd653f",
    "c900e2768696a783f34a6ce548aad6d4241051fac15b1622fa7beeb521ae43e",
    "16516dd786b870268e7601ad9c9dbf53530fef54041a2d18f2b5fbf15c0724ea",
    "17c4ec5654f5d2f37953f228be1aa796d482a395c08dba65c82c020ebc6e03d8",
    "639cb7c0f0d4345900b64f14ee33ecfccc7d6bcb5e18d027fb3452bfc9e5c4d1",
    "12607ff71c803562dfb985769caaebf867172c13b20853368da1ebb099817f0d",
    "aab48288f2067b9adf650ed68556652e9c34f4338b9d61ae5a35065f8c1c9413",
    "5e8f3740ec1aabc872d8149c5e00b5b739cce63971db6edab30f94ccffed9d37",
    "b69e02edd267ea9bd7bf3f67f2a5cfff0f5aa8caf7c081e2d7221ac78277970a",
    "b698cefe18ac367f930332dd77f4a6d390be7adb36380e568761df4683562f84"
]
const UUIDRegex = /([0-9a-f]{8})(?:-|)([0-9a-f]{4})(?:-|)(4[0-9a-f]{3})(?:-|)([89ab][0-9a-f]{3})(?:-|)([0-9a-f]{12})/;
var model = "auto-detect";

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

// add layers button
const createLayerBtn = () => {
    waitForSelector('#play-pause-btn', () => {
        var pauseBtn = document.querySelector('#play-pause-btn');
        var layerBtn = document.createElement('button');
        layerBtn.id = 'layer-btn';
        layerBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
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
        if (!document.querySelector("#elytra-btn")) {
            var pauseBtn = document.querySelector('#play-pause-btn');
            var elytraBtn = document.createElement('button');
            elytraBtn.id = 'elytra-btn';
            elytraBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0');
            elytraBtn.setAttribute('style', 'width:36px;height:36px;margin-top:177.5px!important;')
            elytraBtn.title = "Elytra";
            let elytraIcon = document.createElement('i');
            elytraIcon.classList.add('fas');
            elytraIcon.classList.add('fa-dove');
            elytraBtn.innerHTML = elytraIcon.outerHTML;
            pauseBtn.outerHTML += elytraBtn.outerHTML;
        }

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

const getSkinFromId = async (uuid) => {
    var sessionAPI = await fetch("https://api.gapple.pw/cors/sessionserver/" + encodeURIComponent(uuid));
    if (sessionAPI.status == 200) {
        const sessionJSON = await sessionAPI.json();
        var sessionData = JSON.parse(atob(sessionJSON.properties[0].value));
        var skinTextureURL = sessionData.textures.SKIN.url;
        return skinTextureURL?.replace('http:', 'https:');
    }
}

// get/cache special capes
function getSpecialCapes(supabase_data) {
    if (Object.keys(specialCapes).length > 0) return specialCapes;
    supabase_data.categories.forEach(cat => {
        specialCapes[cat.name] = supabase_data.capes.filter(cape => cape.category == cat.id);
    });
    return specialCapes;
}

// get/cache official minecraft capes
function getOfficialCapes(supabase_data) {
    if (Object.keys(officialCapes).length > 0) return officialCapes;
    const tempOrder = [];
    supabase_data.tester_categories.forEach(cat => {
        officialCapes[cat.name] = supabase_data.nmc_capes.filter(cape => cape.tester_category == cat.id);
        const testerCapes = supabase_data.tester_capes.filter(cape => cape.category == cat.id);
        officialCapes[cat.name] = officialCapes[cat.name].concat(testerCapes);
        tempOrder[cat.position] = cat.name;
    });
    officialCapesCategoryOrder = tempOrder;
    return officialCapes;
}

waitForSelector('main', (main) => {
    // get url params for applying skin/cape
    const urlParams = new URLSearchParams(window.location.search);
    const skinParam = urlParams.get('skin');
    const capeParam = urlParams.get('cape');
    const nmceCapeParam = urlParams.get('nmceCape');
    const modelParam = urlParams.get('model');
    const nameParam = urlParams.get('username');

    if (modelParam) model = modelParam;

    main.innerHTML = `<h1 class="text-center">Skin & Cape Tester</h1>
        <hr class="mt-0">
        <div class="row">
          <div class="col-md-6 col-lg-6">
            <div class="card mb-3">
              <div class="card-body text-center p-0">
                <div class="position-relative checkered animation-paused">
                  <canvas class="drop-shadow auto-size align-top" id="skin_container" width="276" height="368"
                    style="touch-action: none; width: 276px; height: 368px;"></canvas>
                  <button id="play-pause-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" title="Play"
                    data-play-title="Play" data-pause-title="Pause" style="width:36px;height:36px;">
                    <i class="fas fa-pause"></i>
                  </button>
                  <button style="width:36px;height:36px;margin-top:50px!important;" id="capture" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" title="Capture">
                    <i class="fas fa-camera"></i>
                  </button>
                  <button style="width:36px;height:36px;margin-top:92.5px!important;" id="download" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" title="Download">
                    <i class="fas fa-arrow-alt-to-bottom"></i>
                  </button>
                  <button id="layer-btn" class="btn btn-secondary position-absolute top-0 end-0 m-2 p-0" style="width:36px;height:36px;margin-top:135px!important;" title="No Layers">
                    <i class="fas fa-clone"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-6">
            <div class="card mb-3">
              <div class="card-header py-1"><strong>Settings</strong></div>
              <div class="card-body">
                <div id="settings">
                  <div class="row g-1 mb-3">
                    <label class="col-3 col-form-label" for="skin"><strong>Choose a Skin:</strong></label>
                    <br>
                    <div class="col">
                      <div class="input-group">
                        <input class="form-control" id="skin" name="skin" type="text"
                          placeholder="Name / UUID / Texture ID / NameMC ID">
                      </div>
                      <div class="input-group" style="margin-top:.5rem">
                        <input class="form-control" id="uploadskin" name="uploadskin" type="file" accept="image/*">
                      </div>
                      <div class="mt-2 d-flex gap-3">
                        <div class="d-flex gap-2 align-items-center">
                          <input type="radio" id="auto" name="modelRadio" onchange="model='auto-detect'"${!modelParam ? ' checked' : ''}>
                          <label for="auto">Auto</label>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                          <input type="radio" id="classic" name="modelRadio" onchange="model='default'"${modelParam === 'classic' ? ' checked' : ''}>
                          <label for="classic">Classic</label>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                          <input type="radio" id="slim" name="modelRadio" onchange="model='slim'"${modelParam === 'slim' ? ' checked' : ''}>
                          <label for="slim">Slim</label>
                        </div>
                      </div>
                    </div>
                    <div class="col-12"></div>
                    <div class="form-group">
                      <label for="capeselection"><strong>Choose a Cape Type:</strong></label>
                      <br>
                      <div>
                        <input type="radio" id="none" name="capeRadio" checked>
                        <label for="none">None</label>
                      </div>
                      <div>
                        <input type="radio" id="vanilla" name="capeRadio">
                        <label for="vanilla">Official</label>
                      </div>
                      <div>
                        <input type="radio" id="optifine" name="capeRadio">
                        <label for="optifine">OptiFine</label>
                      </div>
                      <div>
                        <input type="radio" id="special" name="capeRadio">
                        <label for="special">Third-Party</label>
                      </div>
                      <div>
                        <input type="radio" id="upload" name="capeRadio">
                        <label for="upload">Upload</label>
                      </div>
                    </div>
                    <div class="form-group" id="capemenu" style="display:none;"></div>
                  </div>
                  <hr class="mt-0">
                  <div class="text-center">
                    <button class="btn btn-primary px-4" type="submit" id="apply">Apply</button>
                  </div>
                  </div>
                </div>
              </div>
            </div>`;
    waitForFunc("skinview3d", () => {
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

        fixPauseBtn();

        if (Math.floor(Math.random() * 2) == 1) {
            skinViewer.loadSkin('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAdVBMVEUAAAAAaGgAf38ApKQAr68AzMwDenoElZUFiIgKvLwkGAgmGgooKCgrHg0zJBE0JRI3Nzc6MYk/KhU/Pz9BNZtCHQpGOqVJJRBKSkpSPYlVVVVqQDB2SzN3QjWBUzmPXj6QWT+UYD6bY0mqclmzeV63g2v///9KLpkGAAAAAXRSTlMAQObYZgAAAvdJREFUWMPtlu1aozAQhWtBSdmSBYpVV4Vs0vX+L3HPmUmUdqsN/bsOSCc8zst8BGZWqyhNY3HaZoyyWiqN7XES8AK5BgBjHu5FxF3hAQLA3/WARoNwGsJygGUOm74fHVPopuWAXmKw06jHFTmwzGMzTg+QcVoQOyxrXnsICFgwHG4LaE1O9pu6trYmwfKoa91UPe/3WbHLDvKHP4fgf8q6Z0FJtvayB/QYz/ThcAgheLHSMCSQrA3UOF+Ht6fgn95C7Z3csrWAbE79be0hITw/wwNILf4jFUzHRUDd1M5P4283Pby+3kMZJ+9wk4AmBzA62JMw3j/co/4OC++4HX9AMt/KDtK2221a3wYgfLjtoqT7ZVkWCDWcBWy3bfsOgD0IZwFIk7vswWeADQE5HnwSQiEhnHgwDN2w3+87/AxQugqC56CsRal6gStMYVzgZw3h4gPQfQDwu6+MqcqyCoFX0WFZvtuX65ubNdQ5QAyHBDB3d6aACS/USSCrFPOiEgAW5wE47yDJiDrjhl6so9xA+HsEYBgkMGE0wtMJMBFQSfK8dzxEsDj2gCch+KPbBu4SEEMQh/im4kAN+NrMSplif8+BkcwVeKxJOpdiBYQAcM7KeAxg5g3dZvmgC6CIgCAAd+RBJ4ZDSsRQwcZUkrdKNKlfZcR/fd2PAY+Pab89ilRiVkkeKbSGvQkKCPrpmAHaHax+0XRHdafFgD8GZlQQEZS9ArwC/BzQtjsa7lrR2rilURZjNC9g4coCaA6dIFbf8l/KRoX7uiihfGfkW7LmhXmzZU/i52gRYN7uCXD+TFvP92BTnp0LFnhQuNzvoM4LQ+rWg84D2tqP5oKvAGKpc8Ne23kkzOeCrwBd7PcJUEVjQvI9IABamgeSpO9B+j78CziZF3Qe0HbCvnjZA+2xOrJAZy+Ko0HIKuVRCJA4EKTpICxIos4LLo0ksT1nbKK0EzQWl/q5zwSczgvJPiXhIuB0XkjzQErDZcDJvKAVZPp0Pjj9/7/jX3fLYvZOsQAAAABJRU5ErkJggg==');
        } else {
            skinViewer.loadSkin('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAZlBMVEUAAAAYOBYjYiQoKCgrVCg2NjY/Pz9PT09YWFhcOydkQSxlZWVsRi5vb29xq25yTjZ1UDh7snh8Vz6AglqGuYSMvoqUlmuUyJLUt4/egS7fxKLljT/rmD/r0LDvu7Hv2r/zqFj///9X5330AAAAAXRSTlMAQObYZgAAAy9JREFUWMPtVmtjojAQ1CrykMIFiRASCv3/f/JmNsGC1yr49bpIhOjMTjaP3d0umHXW4LLWGXyc2201BzPGsH2VYBwJ9kqc3UxgjfdshMGZ7QpGGBrPY80LCqxzGEDXIhL2BQJEb4R623Vd24JkuwLoZxy7rod13XoghIvrkQpGLoSRQ0E/b7vCsyCtHwBb6mCvk8410Z/cYfyESzRkRKB5TkB3dA2Gfuh7YbDiXFieB5ODpuv+820Y3j5771piYqDErJk+i8APk3X2FhMzrllQ3H0B//ExYBDdaEfjjAjAb88VWNO2nHvh6BlHwC13heOuWLUWClgUHQ7Tu64ZGWeLYLd+reHjB4LDIYq+CGruKVcUKWxJ0LffEqTpUsGlJYPgwfBcAf61UHDBhsIoviP4R0GttcrKKsuyoqhh+BMEIJjtpfgyJf3ym7QzgkypLK+qHAxZmmaZVkrXV0znIARqgpO6Zksn9YygzPMS+KoEAZ9AoGp1HYgHmm9aN7pp0PqGrzOCilDgq1yYKl1QgroSXyvcjZbrsrAZQU44WKAkT3EDIwhiQSAu4brpe3/Q0Pr5TCRJAullnuEhOZ8TaCZANRgpWeQZPX6nkIKLdkZwBig5C1gMIDolqGY88K1IEfZa7zfeXAFR74JNTnF84iw0ShcEIR6YZLw9IiAoCeA4SeL9fn9k/HWh1REv4OBVTAQYxJ0CgAI44Y1JKI5E7o9HPvMbtr/hoWFBEBP1ziCQJY4xhYpLhVdYf4rLb9rtnmFGEJ1OMccfn04RniNNXPYHlsniU2EJ30JwPwu/9vC4Hn3CYdZ/iYHZQRLPa/DdmsT6WMCyULvSpuPgukrB7zL43w3ZbJFsndbbDpH7gsNZ3fZbCNK7dD/ajQpIMFcw6g0KmOazqvTpXk7U2rqpOLCrCZBsmW6hBEczCKRAWNYFDwjykvlarMxmlcGyLvjJfJmAEZTCkN/XBeFACMfDDwRl5csOWigIQnmwQsFdvRCHgiAkphUEkua+6oXEJ9PJ1iggalYvbCaQVD+rF251+GoFs3qBJgHcEoN5vUCT0qyfkvsKglAvnKd6QSqCBwr+Ak0igZxltPjNAAAAAElFTkSuQmCC');
        }

        // make layer button work
        document.querySelector("#layer-btn").onclick = toggleLayers;

        const captureSkin = () => {
            var a = document.createElement("a");
            a.href = skinViewer.canvas.toDataURL();
            a.setAttribute("download", "body");
            a.click();
        }

        const downloadSkin = () => {
            var a = document.createElement("a");
            a.href = skinViewer.skinCanvas.toDataURL();
            a.setAttribute("download", "skin");
            a.click();
        }

        capture.onclick = captureSkin;
        download.onclick = downloadSkin;

        var skinValue = "";

        skin.onchange = () => skinValue = skin.value;

        uploadskin.onclick = () => uploadskin.value = '';

        uploadskin.onchange = () => {
            const skinFile = document.querySelector("#uploadskin").files[0];
            const skinReader = new FileReader();

            skinReader.addEventListener(
                "load",
                () => {
                    skinValue = skinReader.result;
                },
                false,
            );

            if (skinFile) {
                skinReader.readAsDataURL(skinFile)
            }
        }

        apply.onclick = async () => {
            const isNameMCID = /^[a-f0-9]{16}$/i;
            if (elytraOn && !noElytra.includes(currentCape.split("/").at(-1))) {
                try {
                    await skinViewer.loadCape(currentCape, {
                        backEquipment: "elytra"
                    });
                } catch {
                    alert("The cape you uploaded is invalid.");
                }
            } else {
                try {
                    await skinViewer.loadCape(currentCape);
                } catch {
                    alert("The cape you uploaded is invalid.");
                }
            }

            if (isNameMCID.test(skinValue)) {
                skinViewer.loadSkin("https://cors.faav.top/namemc/texture/" + encodeURIComponent(skinValue), {
                    model
                });
            } else if (skinValue.startsWith("data:")) {
                try {
                    await skinViewer.loadSkin(skinValue, {
                        model
                    });
                } catch {
                    alert("The skin you uploaded is invalid.");
                }
            } else if (skinValue.length > 0) {
                if (UUIDRegex.test(skinValue)) {
                    skinViewer.loadSkin(await getSkinFromId(skinValue), {
                        model
                    });
                } else {
                    const nameAPI = await fetch("https://api.gapple.pw/cors/username/" + encodeURIComponent(skinValue));
                    if (nameAPI.status == 200) {
                        const nameJSON = await nameAPI.json();

                        skinViewer.loadSkin(await getSkinFromId(nameJSON.id), {
                            model
                        });
                    }
                }
            } else {
                skinViewer.loadSkin(skinViewer.skinCanvas.toDataURL(), {
                    model
                });
            }

            if (currentCape && !noElytra.includes(currentCape.split("/").at(-1))) {
                if (document.querySelector("#elytra-btn")) {
                    document.querySelector("#elytra-btn").style.display = "block";
                } else {
                    createElytraBtn();
                    fixPauseBtn();
                }
            } else {
                if (document.querySelector("#elytra-btn")) document.querySelector("#elytra-btn").style.display = "none";
            }
        }

        none.onchange = () => {
            if (none.checked == true) {
                currentCape = null;
                capemenu.style.display = 'none';
            }
        }

        optifine.onchange = () => {
            if (optifine.checked == true) {
                capemenu.innerHTML = `<hr style="margin: 0.7rem 0;">
            <label class="col-4 col-form-label" for="optifinecape"><strong>OptiFine Cape:</strong></label>
            <div class="form-group" id="optifinecape">
              <div>
                <input type="radio" id="stealopti" name="ofRadio" checked>
                <label for="stealopti">Steal a user's OptiFine cape design</label>
              </div>
              <div>
                <input type="radio" id="ofdesign" name="ofRadio">
                <label for="ofdesign">Edit "OF" design</label>
              </div>
              <div>
                <input type="radio" id="banner" name="ofRadio">
                <label for="banner">Edit OptiFine banner</label>
              </div>
            </div>
            <br>
            <div class="form-group" id="optimenus" style="display:unset;"><label for="opticapestealuser">Steal the OptiFine Cape design
                    from:</label><input type="text" class="form-control input-dark" id="opticapestealuser"
                    placeholder="Username with cape" required><small class="form-text text-muted">Note: OptiFine Cape
                    usernames are case sensitive!</small>
            </div>`;

                opticapestealuser.onchange = () => {
                    if (opticapestealuser.value.length > 0) {
                        currentCape = "https://cors.faav.top/optifine/stealCape?username=" + opticapestealuser.value;
                    } else {
                        currentCape = null;
                    }
                }

                capemenu.style.display = 'unset';

                stealopti.onchange = () => {
                    if (stealopti.checked == true) {
                        currentOptifineMode = "steal";
                        optimenus.innerHTML = `<label for="opticapestealuser">Steal the OptiFine Cape design
                        from:</label><input type="text" class="form-control input-dark" id="opticapestealuser"
                        placeholder="Username with cape" required><small class="form-text text-muted">Note: OptiFine Cape
                        usernames are case sensitive!</small>`;

                        opticapestealuser.onchange = () => {
                            if (opticapestealuser.value.length > 0) {
                                currentCape = "https://cors.faav.top/optifine/stealCape?username=" + encodeURIComponent(opticapestealuser.value);
                            } else {
                                currentCape = null;
                            }
                        }
                    }
                }

                ofdesign.onchange = () => {
                    if (ofdesign.checked == true) {
                        currentOptifineMode = "of";
                        optimenus.innerHTML = `<div class="form-inline skinforminline"> <label for="ofcapetop">Top: </label> <input id="ofcapetop" minlength="1"
                        maxlength="16" name="skin" placeholder="Top color" type="text" class="form-control" style="width: 150px;"
                        data-jscolor required></div>
                     <div class="form-inline skinforminline"> <label for="ofcapebottom">Bottom: </label> <input id="ofcapebottom"
                        minlength="1" maxlength="16" name="skin" placeholder="Bottom color" type="text" class="form-control"
                        style="width: 150px;" data-jscolor required></div>
                     <div class="form-inline skinforminline"> <label for="oftext">Text: </label> <input id="oftext" minlength="1"
                        maxlength="16" name="skin" placeholder="Text color" type="text" class="form-control" style="width: 150px;"
                        data-jscolor required></div>
                     <div class="form-inline skinforminline"> <label for="ofshadow">Shadow: </label> <input id="ofshadow" minlength="1"
                        maxlength="16" name="skin" placeholder="Top color" type="text" class="form-control" style="width: 150px;"
                        data-jscolor required></div>`
                    }

                    ofCapeTop = new JSColor('#ofcapetop', {
                        format: 'hex',
                        onChange: () => currentCape = `https://cors.faav.top/optifine/showCape?colTop=${ofCapeTop.toHEXString().replace('#', '')}&colBottom=${ofCapeBottom.toHEXString().replace('#', '')}&colText=${ofText.toHEXString().replace('#', '')}&colShadow=${ofShadow.toHEXString().replace('#', '')}`
                    });
                    ofCapeBottom = new JSColor('#ofcapebottom', {
                        format: 'hex',
                        onChange: () => currentCape = `https://cors.faav.top/optifine/showCape?colTop=${ofCapeTop.toHEXString().replace('#', '')}&colBottom=${ofCapeBottom.toHEXString().replace('#', '')}&colText=${ofText.toHEXString().replace('#', '')}&colShadow=${ofShadow.toHEXString().replace('#', '')}`
                    });
                    ofText = new JSColor('#oftext', {
                        format: 'hex',
                        onChange: () => currentCape = `https://cors.faav.top/optifine/showCape?colTop=${ofCapeTop.toHEXString().replace('#', '')}&colBottom=${ofCapeBottom.toHEXString().replace('#', '')}&colText=${ofText.toHEXString().replace('#', '')}&colShadow=${ofShadow.toHEXString().replace('#', '')}`
                    });
                    ofShadow = new JSColor('#ofshadow', {
                        format: 'hex',
                        onChange: () => currentCape = `https://cors.faav.top/optifine/showCape?colTop=${ofCapeTop.toHEXString().replace('#', '')}&colBottom=${ofCapeBottom.toHEXString().replace('#', '')}&colText=${ofText.toHEXString().replace('#', '')}&colShadow=${ofShadow.toHEXString().replace('#', '')}`
                    });

                    jscolor.init()

                    currentCape = `https://cors.faav.top/optifine/showCape?colTop=${ofCapeTop.toHEXString().replace('#', '')}&colBottom=${ofCapeBottom.toHEXString().replace('#', '')}&colText=${ofText.toHEXString().replace('#', '')}&colShadow=${ofShadow.toHEXString().replace('#', '')}`
                }

                banner.onchange = () => {
                    if (banner.checked == true) {
                        currentOptifineMode = "banner";
                        optimenus.innerHTML = `<div class="form-inline skinforminline"> <label for="optibanner">Banner: </label> <input id="optibanner" minlength="1"
                        maxlength="128" name="skin" placeholder="Banner pattern" type="text" class="form-control input-dark"
                        style="width: 150px;" required></div>
                <div class="form-inline skinforminline"> <label for="ofbannertop">Top: </label> <input id="ofbannertop" minlength="1"
                        maxlength="16" name="skin" placeholder="Top color" type="text" class="form-control input-dark jscolor"
                        style="width: 150px; background-image: linear-gradient(to right, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 30px, rgba(0, 0, 0, 0) 31px, rgba(0, 0, 0, 0) 100%), url(&quot;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAAXNSR0IArs4c6QAAAhdJREFUSEt9VduRwyAMFC1BB04lZ2aSluwCkpRgpwh8JXGjF0jYOT4S7JFgtbuSw7qsFQIAVOAVcBOgQqVtOX75dcCQSnEYzi8BYowYqY+c1yOgHEXO9jE5z7Dtn3dY11Wv1mPd/1EOeqbL3WLUMSYBx8AYfl8F87ESSdeYPM+wI4BlXehsRF0lU0igHAbwHWOKkehpF9MGLwyEpJRi4NAtFIsM7Nv+DuuyVCqBy2wS6J1EoV1SglYSU2TKTemWBQuAcuRnzj/wIQAoQRXlDHK9kyj8j4GUTtJZNsph87vZcs6w7RsCWAy/hkphBBmgCgPhNH7lw5IFgIUEa0GWwHlcyslzA2BN2D2svVAKdoG7mTQPxBoIAOsRa0H1gIXALiUAGzFw7oKuYQWW4PtKMYntR/9zzlHKhYBBTLi9w/1+b+UxTo9WKb46HjnQNm0QbS9WYYi088xM0wTP51MBtLlyQts1thB0jwyJRCeS2DfE0LgqwHRDAK93eAgDrCgbqLZBYEzmGh1P5FK7RDrp0Ijab8gATkqerX1EVZimmzDwQAlag56YdC6/sIIfNOeAb/kowctJMGinVjgf4CcOt6n5lLRZx2B8vuQ2CdADyMDQZdYRMSWZ7dcuRwmYfBXRj62e79nxJlSDXgC5NqEcVgGOY2izgck2qgd1jAQP+VQNw0ISGoCRAHl2k46NLybsEowmxOebeOAPjHk/jG5K1qQAAAAASUVORK5CYII=&quot;) !important; background-position: left top, left top !important; background-size: auto, 32px 16px !important; background-repeat: repeat-y, repeat-y !important; background-origin: padding-box, padding-box !important; padding-left: 40px !important;"
                        data-jscolor required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                        data-current-color="#FFFFFF"></div>
                <div class="form-inline skinforminline"> <label for="ofbannerbottom">Bottom: </label> <input id="ofbannerbottom"
                        minlength="1" maxlength="16" name="skin" placeholder="Bottom color" type="text"
                        class="form-control input-dark jscolor"
                        style="width: 150px; background-image: linear-gradient(to right, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 30px, rgba(0, 0, 0, 0) 31px, rgba(0, 0, 0, 0) 100%), url(&quot;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAAAXNSR0IArs4c6QAAAhdJREFUSEt9VduRwyAMFC1BB04lZ2aSluwCkpRgpwh8JXGjF0jYOT4S7JFgtbuSw7qsFQIAVOAVcBOgQqVtOX75dcCQSnEYzi8BYowYqY+c1yOgHEXO9jE5z7Dtn3dY11Wv1mPd/1EOeqbL3WLUMSYBx8AYfl8F87ESSdeYPM+wI4BlXehsRF0lU0igHAbwHWOKkehpF9MGLwyEpJRi4NAtFIsM7Nv+DuuyVCqBy2wS6J1EoV1SglYSU2TKTemWBQuAcuRnzj/wIQAoQRXlDHK9kyj8j4GUTtJZNsph87vZcs6w7RsCWAy/hkphBBmgCgPhNH7lw5IFgIUEa0GWwHlcyslzA2BN2D2svVAKdoG7mTQPxBoIAOsRa0H1gIXALiUAGzFw7oKuYQWW4PtKMYntR/9zzlHKhYBBTLi9w/1+b+UxTo9WKb46HjnQNm0QbS9WYYi088xM0wTP51MBtLlyQts1thB0jwyJRCeS2DfE0LgqwHRDAK93eAgDrCgbqLZBYEzmGh1P5FK7RDrp0Ijab8gATkqerX1EVZimmzDwQAlag56YdC6/sIIfNOeAb/kowctJMGinVjgf4CcOt6n5lLRZx2B8vuQ2CdADyMDQZdYRMSWZ7dcuRwmYfBXRj62e79nxJlSDXgC5NqEcVgGOY2izgck2qgd1jAQP+VQNw0ISGoCRAHl2k46NLybsEowmxOebeOAPjHk/jG5K1qQAAAAASUVORK5CYII=&quot;) !important; background-position: left top, left top !important; background-size: auto, 32px 16px !important; background-repeat: repeat-y, repeat-y !important; background-origin: padding-box, padding-box !important; padding-left: 40px !important;"
                        data-jscolor required autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                        data-current-color="#FFFFFF"></div>`

                        ofBannerTop = new JSColor('#ofbannertop', {
                            format: 'hex',
                            onChange: () => currentCape = `https://api.mcuserna.me/cors/optifinenet/showBanner?format=${document.getElementById('optibanner').value}&colTop=${ofBannerTop.toHEXString().replace('#', '')}&colBottom=${ofBannerBottom.toHEXString().replace('#', '')}&valign=m`
                        });
                        ofBannerBottom = new JSColor('#ofbannerbottom', {
                            format: 'hex',
                            onChange: () => currentCape = `https://api.mcuserna.me/cors/optifinenet/showBanner?format=${document.getElementById('optibanner').value}&colTop=${ofBannerTop.toHEXString().replace('#', '')}&colBottom=${ofBannerBottom.toHEXString().replace('#', '')}&valign=m`
                        });

                        jscolor.init();

                        document.getElementById('optibanner').onchange = () => {
                            currentCape = `https://api.mcuserna.me/cors/optifinenet/showBanner?format=${document.getElementById('optibanner').value}&colTop=${ofBannerTop.toHEXString().replace('#', '')}&colBottom=${ofBannerBottom.toHEXString().replace('#', '')}&valign=m`
                        }

                        currentCape = `https://api.mcuserna.me/cors/optifinenet/showBanner?format=${document.getElementById('optibanner').value}&colTop=${ofBannerTop.toHEXString().replace('#', '')}&colBottom=${ofBannerBottom.toHEXString().replace('#', '')}&valign=m`
                    }
                }
            }
        }

        upload.onchange = () => {
            if (upload.checked == true) {
                capemenu.innerHTML = `<label class="col-4 col-form-label" for="uploadcape"><strong>Upload Cape:</strong></label>
                <div class="form-group">
                    <div class="input-group">
                        <input class="form-control" id="uploadcape" name="uploadcape" type="file" accept="image/*">
                      </div>
            </div>`;

                capemenu.style.display = 'unset';

                uploadcape.onclick = () => uploadcape.value = '';

                uploadcape.onchange = () => {
                    const capeFile = document.querySelector("#uploadcape").files[0];
                    const capeReader = new FileReader();

                    capeReader.addEventListener(
                        "load",
                        () => {
                            currentCape = capeReader.result;
                        },
                        false,
                    );

                    if (capeFile) {
                        capeReader.readAsDataURL(capeFile)
                    }
                }
            }
        }

        // apply skin
        if (skinParam) {
            skinViewer.loadSkin(`https://cors.faav.top/namemc/texture/${encodeURIComponent(skinParam)}`, {
                model: modelParam
            });
            document.getElementById("skin").value = skinParam;
        }

        window.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.target.blur();
                apply.click();
                e.target.focus();
            }
        });

        waitForSupabase((supabase_data) => {
            // load official capes
            vanilla.onchange = () => {
                if (vanilla.checked) {
                    const dictionary = getOfficialCapes(supabase_data);
                    capemenu.innerHTML = `
                    <label class="col-4 col-form-label" for="officialcapes"><strong>Official Capes:</strong></label>
                    <div class="col">
                        <select class="form-select" id="officialcapes" name="officialcapes">
                            ${officialCapesCategoryOrder.map(key => {
                        const categoryName = key
                        const capes = dictionary[key]
                        var optGroupEl = document.createElement("optgroup");
                        optGroupEl.label = categoryName;
                        optGroupEl.innerHTML = capes.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
                            var optionEl = document.createElement("option");
                            optionEl.value = c.render_texture ?? c.id;
                            optionEl.textContent = c.name;
                            optionEl.id = c.id;

                            return optionEl.outerHTML;
                        }).join("")

                        return optGroupEl.outerHTML;
                    }).join("")}
                        </select>
                    </div>
                `;

                    currentCape = "https://textures.minecraft.net/texture/" + document.querySelector("#officialcapes option:checked").value;

                    capemenu.style.display = 'unset';

                    officialcapes.onchange = () => {
                        if (officialcapes.value && officialcapes.value.length > 0) {
                            currentCape = "https://textures.minecraft.net/texture/" + document.querySelector("#officialcapes option:checked").value;
                        }
                    }
                }
            }

            // load official cape if a url param is present
            if (capeParam && !nmceCapeParam) {
                skinViewer.loadCape(`https://cors.faav.top/namemc/texture/${encodeURIComponent(capeParam)}`);
                createElytraBtn();
                document.querySelector("#vanilla").checked = true;
                document.querySelector("#vanilla").onchange();
                const optionEl = document.getElementById(capeParam);
                if (optionEl) optionEl.selected = true;
                else {
                    document.querySelector("#optifine").checked = true;
                    document.querySelector("#optifine").onchange();

                    if (nameParam) document.querySelector("#opticapestealuser").value = nameParam;
                    document.querySelector("#opticapestealuser").onchange();
                }
                document.querySelector("#officialcapes").onchange();
                fixPauseBtn();
            }

            // load special capes
            special.disabled = false;
            special.onchange = () => {
                if (special.checked) {
                    const dictionary = getSpecialCapes(supabase_data);
                    capemenu.innerHTML = `
                    <label class="col-4 col-form-label" for="specialcapes"><strong>Third-Party:</strong></label>
                    <div class="col">
                        <select class="form-select" id="specialcapes" name="specialcapes">
                            ${Object.keys(dictionary).map(key => {
                        const categoryName = key
                        const capes = dictionary[key]
                        var optGroupEl = document.createElement("optgroup");
                        optGroupEl.label = categoryName;
                        optGroupEl.innerHTML = capes.sort((a, b) => a.name.localeCompare(b.name)).map(c => {
                            var optionEl = document.createElement("option");
                            optionEl.value = c.image_src;
                            optionEl.textContent = c.name;
                            optionEl.id = c.id;

                            return optionEl.outerHTML;
                        }).join("")

                        return optGroupEl.outerHTML;
                    }).join("")}
                        </select>
                    </div>
                `;

                    currentCape = document.querySelector("#specialcapes").value;

                    capemenu.style.display = 'unset';

                    specialcapes.onchange = () => {
                        if (specialcapes.value && specialcapes.value.length > 0) {
                            currentCape = document.querySelector("#specialcapes option:checked").value;
                        }
                    }
                }
            }

            // apply special cape if a url param is present
            if (nmceCapeParam) {
                const cape = supabase_data.capes.find(cape => cape.id == capeParam);
                if (cape) {
                    skinViewer.loadCape(cape.image_src);
                    createElytraBtn();
                    special.checked = true;
                    special.onchange();
                    document.getElementById(capeParam).selected = true;
                    currentCape = document.querySelector("#specialcapes").value;
                    fixPauseBtn();
                }
            }
        });
    });
});
