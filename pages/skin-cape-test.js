// only use for getting animate cookie
function getCookie(name) {
    let cookies = Object.fromEntries(document.cookie.split(';').map(e => e.split('=').map(e => decodeURIComponent(e.trim()))));
    return cookies[name];
}

var paused = (getCookie("animate") === "false");
var elytraOn = false;
var layer = true;
var currentCape = null;
var currentOptifineMode = "steal"
var specialCapes = {};

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

const waitForSupabase = function (callback) {
    if (window.localStorage.getItem("supabase_data") && window.localStorage.getItem("supabase_data").length != 0) {
        callback(JSON.parse(window.localStorage.getItem("supabase_data")));
    } else {
        setTimeout(function () {
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
        if (!document.querySelector("#elytra-btn")) {
            var pauseBtn = document.querySelector('#play-pause-btn');
            var elytraBtn = document.createElement('button');
            elytraBtn.id = 'elytra-btn';
            elytraBtn.setAttribute('class', 'btn btn-secondary position-absolute top-0 end-0 m-2 p-0')
            elytraBtn.classList.add('p-0');
            elytraBtn.setAttribute('style', 'width:36px;height:36px;margin-top:177.5px!important;')
            elytraBtn.title = "Elytra";
            elytraIcon = document.createElement('i');
            elytraIcon.classList.add('fas');
            elytraIcon.classList.add('fa-dove');
            elytraBtn.innerHTML = elytraIcon.outerHTML;
            pauseBtn.outerHTML += elytraBtn.outerHTML;
        }

        document.querySelector('#elytra-btn').onclick = () => {
            var elytraIconEl = document.querySelector('#elytra-btn i');
            if (!elytraOn) {
                elytraOn = true;
                elytraIconEl.classList.toggle('fa-dove');
                elytraIconEl.classList.toggle('fa-square');
                elytraIconEl.parentElement.title = "No Elytra"
                skinViewer.loadCape(skinViewer.capeCanvas.toDataURL(), {
                    backEquipment: "elytra"
                });
            } else {
                elytraOn = false;
                elytraIconEl.classList.toggle('fa-square');
                elytraIconEl.classList.toggle('fa-dove');
                elytraIconEl.parentElement.title = "Elytra"
                skinViewer.loadCape(skinViewer.capeCanvas.toDataURL());
            }
        }
    });
}

// get/cache special capes
function getSpecialCapes(supabase_data) {
    if (Object.keys(specialCapes).length > 0) return specialCapes;
    supabase_data.categories.forEach(cat => {
        specialCapes[cat.name] = supabase_data.capes.filter(cape => cape.category == cat.id);
    });
    return specialCapes;
}

waitForSelector('main', (main) => {
    main.style["margin-top"] = "1rem";

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
                    <label class="col-4 col-form-label" for="skin"><strong>Choose a Skin:</strong></label>
                    <br>
                    <div class="col">
                      <div class="input-group">
                        <input class="form-control" id="skin" name="skin" type="text"
                          placeholder="UUID / Texture ID / NameMC ID"><br>
                      </div>
                      <small id="skinHelp" class="form-text text-muted">Note: You can't input a Username.</small>
                    </div>
                    <div class="col-12"></div>
                    <div class="form-group">
                      <label for="capeselection">Choose a Cape Type:</label>
                      <br>
                      <div class="custom-control custom-radio custom-control-inline">
                        <input type="radio" id="none" name="customRadioInline" class="custom-control-input" checked>
                        <label class="custom-control-label" for="none">None</label>
                      </div>
                      <div class="custom-control custom-radio custom-control-inline">
                        <input type="radio" id="vanilla" name="customRadioInline" class="custom-control-input">
                        <label class="custom-control-label" for="vanilla">Official</label>
                      </div>
                      <div class="custom-control custom-radio custom-control-inline">
                        <input type="radio" id="optifine" name="customRadioInline" class="custom-control-input">
                        <label class="custom-control-label" for="optifine">OptiFine</label>
                      </div>
                      <div class="custom-control custom-radio custom-control-inline">
                        <input type="radio" id="special" name="customRadioInline" class="custom-control-input" disabled>
                        <label class="custom-control-label" for="special">Special</label>
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

        apply.onclick = () => {
            const isNameMCID = /^[a-f0-9]{16}$/i;
            if (elytraOn) {
                skinViewer.loadCape(currentCape, {
                    backEquipment: "elytra"
                })
            } else {
                skinViewer.loadCape(currentCape)
            }

            if (isNameMCID.test(skin.value)) {
                skinViewer.loadSkin(`https://cors.faav.top/namemc/texture/${skin.value}`)
            } else if (skin.value.length > 0) {
                skinViewer.loadSkin('https://nmsr.nickac.dev/skin/' + skin.value)
            }

            if (currentCape) {
                createElytraBtn()
            } else {
                if (document.querySelector("#elytra-btn")) document.querySelector("#elytra-btn").remove()
            }
        }

        none.onchange = () => {
            if (none.checked == true) {
                currentCape = null;
                capemenu.style.display = 'none';
            }
        }

        vanilla.onchange = () => {
            if (vanilla.checked == true) {
                capemenu.innerHTML = `<label class="col-4 col-form-label" for="officialcapes"><strong>Official Capes:</strong></label>
                <div class="col">
                    <select class="form-select" id="officialcapes" name="officialcapes" required>
                        <optgroup label="Common">
                            <option value="2340c0e03dd24a11b15a8b33c2a7e9e32abb2051b2481d0ba7defd635ca7a933">Migrator</option>
                            <option value="f9a76537647989f9a0b6d001e320dac591c359e9e61a31f4ce11c88f207f0ad4">Vanilla</option>
                            <option value="afd553b39358a24edfe3b8a9a939fa5fa4faa4d9a9c3d6af8eafb377fa05c2bb">Cherry Blossom
                            </option>
                        </optgroup>
                        <optgroup label="Minecon">
                            <option value="e7dfea16dc83c97df01a12fabbd1216359c0cd0ea42f9999b6e97c584963e980">Minecon 2016</option>
                            <option value="b0cc08840700447322d953a02b965f1d65a13a603bf64b17c803c21446fe1635">Minecon 2015</option>
                            <option value="153b1a0dfcbae953cdeb6f2c2bf6bf79943239b1372780da44bcbb29273131da">Minecon 2013</option>
                            <option value="a2e8d97ec79100e90a75d369d1b3ba81273c4f82bc1b737e934eed4a854be1b6">Minecon 2012</option>
                            <option value="953cac8b779fe41383e675ee2b86071a71658f2180f56fbce8aa315ea70e2ed6">Minecon 2011</option>
                        </optgroup>
                        <optgroup label="Special">
                            <option value="17912790ff164b93196f08ba71d0e62129304776d0f347334f8a6eae509f8a56">Realms Mapmaker
                            </option>
                            <option value="9e507afc56359978a3eb3e32367042b853cddd0995d17d0da995662913fb00f7">Mojang (New)</option>
                            <option value="5786fe99be377dfb6858859f926c4dbc995751e91cee373468c5fbf4865e7151">Mojang</option>
                            <option value="8f120319222a9f4a104e2f5cb97b2cda93199a2ee9e1585cb8d09d6f687cb761">Mojang (Classic)
                            </option>
                            <option value="ae677f7d98ac70a533713518416df4452fe5700365c09cf45d0d156ea9396551">Mojira Moderator
                            </option>
                            <option value="1bf91499701404e21bd46b0191d63239a4ef76ebde88d27e4d430ac211df681e">Translator</option>
                            <option value="2262fb1d24912209490586ecae98aca8500df3eff91f2a07da37ee524e7e3cb6">Translator (Chinese)
                            </option>
                            <option value="ca35c56efe71ed290385f4ab5346a1826b546a54d519e6a3ff01efa01acce81">Cobalt</option>
                            <option value="3efadf6510961830f9fcc077f19b4daf286d502b5f5aafbd807c7bbffcaca245">Scrolls</option>
                        </optgroup>
                        <optgroup label="Custom">
                            <option value="5048ea61566353397247d2b7d946034de926b997d5e66c86483dfb1e031aee95">Turtle</option>
                            <option value="2056f2eebd759cce93460907186ef44e9192954ae12b227d817eb4b55627a7fc">Birthday</option>
                            <option value="6a7cf0eb5cfe7e7c508b364e32916dfd28d164e7bf6d92c6ea7811b82451e760">Valentine</option>
                            <option value="bcfbe84c6542a4a5c213c1cacf8979b5e913dcb4ad783a8b80e3c4a7d5c8bdac">dannyBstyle</option>
                            <option value="70efffaf86fe5bc089608d3cb297d3e276b9eb7a8f9f2fe6659c23a2d8b18edf">Millionth Customer
                            </option>
                            <option value="d8f8d13a1adf9636a16c31d47f3ecc9bb8d8533108aa5ad2a01b13b1a0c55eac">Prismarine</option>
                            <option value="23ec737f18bfe4b547c95935fc297dd767bb84ee55bfd855144d279ac9bfd9fe">JulianClark</option>
                            <option value="2e002d5e1758e79ba51d08d92a0f3a95119f2f435ae7704916507b6c565a7da8">MrMessiah</option>
                            <option value="ca29f5dd9e94fb1748203b92e36b66fda80750c87ebc18d6eafdb0e28cc1d05f">cheapsh0t</option>
                        </optgroup>
                        <optgroup label="Previous or Temporary Capes">
                            <option value="fd14214cd8073059e93d9c626260f5df85e5a959181537119df56cadaf5002cc">Bacon</option>
                            <option value="2ada7acf3e0ef436f350e21af91a774b7cd95309c53668a441eeacec88ca4211">Christmas 2010
                            </option>
                            <option value="d1f20f8534f9f58a3a0a26586d5615f513add564809986334b7f247593425ee3">New Year's 2011
                            </option>
                            <option value="938155dd83118a3993a22579649fab313cdb06073029c3839843d58fad06ebb2">Xbox 360 1st Birthday
                                Cape</option>
                        </optgroup>
                        <optgroup label="Bedrock Capes">
                            <option value="99aba02ef05ec6aa4d42db8ee43796d6cd50e4b2954ab29f0caeb85f96bf52a1">Founder's Cape
                            </option>
                            <option value="28de4a81688ad18b49e735a273e086c18f1e3966956123ccb574034c06f5d336">Pancape</option>
                        </optgroup>
                    </select>
                </div>`;

                currentCape = "https://textures.minecraft.net/texture/" + document.querySelector("#officialcapes option:checked").value;

                capemenu.style.display = 'unset';

                officialcapes.onchange = () => {
                    if (officialcapes.value && officialcapes.value.length > 0) {
                        currentCape = "https://textures.minecraft.net/texture/" + document.querySelector("#officialcapes option:checked").value;
                    }
                }
            }
        }

        optifine.onchange = () => {
            if (optifine.checked == true) {
                capemenu.innerHTML = `<hr style="margin: 0.7rem 0;">
            <label class="col-4 col-form-label" for="optifinecape"><strong>OptiFine Cape:</strong></label>
                <div class="form-group" id="optifinecape">
                <div class="custom-control custom-radio"> <input type="radio" id="stealopti" name="customRadio"
                        class="custom-control-input" checked> <label class="custom-control-label"
                        for="stealopti">Steal a user's OptiFine cape design</label> </div>
                <div class="custom-control custom-radio"> <input type="radio" id="ofdesign" name="customRadio"
                        class="custom-control-input"> <label class="custom-control-label"
                        for="ofdesign">Edit "OF" design</label> </div>
                <div class="custom-control custom-radio"> <input type="radio" id="banner" name="customRadio"
                        class="custom-control-input"> <label class="custom-control-label" for="banner">Edit
                        OptiFine banner</label>
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
                                currentCape = "https://cors.faav.top/optifine/stealCape?username=" + opticapestealuser.value;
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

                        jscolor.init()

                        currentCape = `https://api.mcuserna.me/cors/optifinenet/showBanner?format=${document.getElementById('optibanner').value}&colTop=${ofBannerTop.toHEXString().replace('#', '')}&colBottom=${ofBannerBottom.toHEXString().replace('#', '')}&valign=m`
                    }
                }
            }
        }

        waitForSupabase((supabase_data) => {
            special.disabled = false;
            special.onchange = () => {
                if (special.checked) {
                    const dictionary = getSpecialCapes(supabase_data);
                    capemenu.innerHTML = `
                    <label class="col-4 col-form-label" for="specialcapes"><strong>Special (Unobtainable):</strong></label>
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

                            return optionEl.outerHTML;
                        }).join("")

                        return optGroupEl.outerHTML;
                    }).join("")}
                        </select>
                    </div>
                `;

                    currentCape = document.querySelector("#specialcapes option:checked").value;

                    capemenu.style.display = 'unset';

                    specialcapes.onchange = () => {
                        if (specialcapes.value && specialcapes.value.length > 0) {
                            currentCape = document.querySelector("#specialcapes option:checked").value;
                        }
                    }
                }
            }
        });
    });
});
