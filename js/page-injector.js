(async () => {
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

    var iframeEl = document.createElement("iframe");
    iframeEl.width = 0;
    iframeEl.height = 0;
    iframeEl.id = "nmcIf";
    iframeEl.srcdoc = `<script>
    window.addEventListener("storage", (event) => {
        const storageEvent = new StorageEvent("storage", {
            key: event.key,
            newValue: event.newValue,
            oldValue: event.oldValue,
            storageArea: localStorage,
            url: window.location.href
        });

        window.top.dispatchEvent(storageEvent);
    });
    </script>`;
    document.documentElement.append(iframeEl);

    window.top.addEventListener('storage', () => {
        let allLocalStorage = { ...localStorage };
        chrome.storage.local.set({ savedLocalStorage: allLocalStorage });
    });

    await chrome.storage.local.get("savedLocalStorage").then((result) => {
        if (result.savedLocalStorage) {
            for (const key in result.savedLocalStorage) {
                localStorage.setItem(key, result.savedLocalStorage[key]);
            }
        }
        return result.savedLocalStorage || {};
    });

    var theme = localStorage.getItem("theme");
    var customThemeOn = localStorage.getItem("customTheme") === "true";
    var customBg = localStorage.getItem("customBg") || (theme == "dark" ? "#12161A" : "#EEF0F2");
    var customText = localStorage.getItem("customText") || (theme == "dark" ? "#dee2e6" : "#212529");
    var customLink = localStorage.getItem("customLink") || (theme == "dark" ? "#7ba7ce" : "#236dad");
    var customBtn = localStorage.getItem("customBtn") || "#236dad";
    var customBase = localStorage.getItem("customBase") || (theme == "dark" ? "dark" : "light");
    var hideHeadCmd2 = localStorage.getItem("hideHeadCmd2") === "false";
    var hideDegreesOfSep2 = localStorage.getItem("hideDegreesOfSep2") === "false";
    var hideBadges2 = localStorage.getItem("hideBadges2") === "false";
    var bedrockCapes = localStorage.getItem("bedrockCapes") === "true";
    var linksTextArea = localStorage.getItem("linksTextArea") ?? `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`;
    var hideCreatedAt = localStorage.getItem("hideCreatedAt") === "false";
    var hideElytra = localStorage.getItem("hideElytra") === "false";
    var hideLayers = localStorage.getItem("hideLayers") === "false";
    var hideSkinStealer = localStorage.getItem("hideSkinStealer") === "false";
    var hideServers = localStorage.getItem("hideServers") === "false";
    var hideFollowing = localStorage.getItem("hideFollowing") === "false";
    var hideOptifine = localStorage.getItem("hideOptifine") === "false";

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function setCustomTheme() {
        var linkRgb = hexToRgb(customLink);
        var btnRgb = hexToRgb(customBtn);
        document.documentElement.style.setProperty("--bs-body-bg", customBg);
        document.documentElement.style.setProperty("--bs-body-color", customText);
        document.documentElement.style.setProperty("--ne-link-rgb", `${linkRgb["r"]}, ${linkRgb["g"]}, ${linkRgb["b"]}`);
        document.documentElement.style.setProperty("--ne-btn-rgb", `${btnRgb["r"]}, ${btnRgb["g"]}, ${btnRgb["b"]}`);
        document.documentElement.setAttribute("data-bs-theme", customBase);
        document.documentElement.classList.add("customTheme");
        localStorage.theme = customBase;

        var bgRgb = hexToRgb(customBg);
        let multiplier = 1.15;
        let opacity = .5;
        if (customBase === 'dark') {
            multiplier = 1.35;
            opacity = .45;
        }

        document.documentElement.style.setProperty("--ne-checkered", `rgba(${bgRgb["r"] * multiplier}, ${bgRgb["g"] * multiplier}, ${bgRgb["b"] * multiplier}, ${opacity})`);
    }

    if (customThemeOn) setCustomTheme();
    if (hideHeadCmd2) document.documentElement.style.setProperty("--head-cmd", hideHeadCmd2 ? 'none' : 'flex');
    if (hideServers) document.documentElement.style.setProperty("--servers", hideServers ? 'none' : 'flex');
    if (hideFollowing) document.documentElement.style.setProperty("--following", hideFollowing ? 'none' : 'flex');
    if (hideDegreesOfSep2) document.documentElement.style.setProperty("--degrees-of-sep", hideDegreesOfSep2 ? 'none' : 'flex');
    if (hideOptifine) document.documentElement.style.setProperty("--optifine", hideOptifine ? 'none' : 'flex');

    const createSettingsButton = () => {
        const modalHTML = `
            <div class="modal fade" id="settingsModal" tabindex="-1" role="dialog" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg" role="document" style="max-width:600px">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="settingsModalLabel">NameMC Extras Settings</h5>
                            <button type="button" class="btn" data-bs-dismiss="modal" aria-label="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="settings-section mb-4">
                                <h6 class="settings-heading">
                                    <i class="fas fa-palette me-2"></i>Theme Settings
                                </h6>
                                <div class="card">
                                    <div class="card-body">
                                        <label class="form-label mb-2">
                                            <strong>Base Theme:</strong>
                                            <small class="text-muted ms-2">Choose between light, dark, or custom theme</small>
                                        </label>
                                        <div class="btn-group w-100 mb-4" role="group" aria-label="Theme">
                                            <button type="button" class="btn btn-light" data-bs-theme-value="light" id="lightTheme">
                                                <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/2600-fe0f.svg" alt="☀️">
                                                Light
                                            </button>
                                            <button type="button" class="btn btn-dark" data-bs-theme-value="dark" id="darkTheme">
                                                <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/1f319.svg" alt=" ">
                                                Dark
                                            </button>
                                            <button type="button" class="btn btn-secondary" id="customTheme">
                                                <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/1f308.svg" alt=" ">
                                                Custom
                                            </button>
                                        </div>
                                        
                                        <div class="custom-theme-section">
                                            <div class="d-flex flex-wrap align-items-end mb-2">
                                                <strong class="me-auto">Custom Theme:</strong>
                                                <div class="btn-group btn-group-sm flex-wrap mt-2 mt-sm-0 clean-control">
                                                    <a class="btn bg-body-tertiary" title="Reset back to base colors" id="resetcustom" href="javascript:void(0)">
                                                        <i class="fas fa-undo-alt"></i> Reset
                                                    </a>
                                                    <a class="btn bg-body-tertiary" title="Export custom theme" id="exportcustom" href="javascript:void(0)">
                                                        <i class="fas fa-upload"></i> Export
                                                    </a>
                                                    <a class="btn bg-body-tertiary" title="Import custom theme" id="importcustom" href="javascript:void(0)">
                                                        <i class="fas fa-download"></i> Import
                                                    </a>
                                                </div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Base Theme</span>
                                                <select class="form-select" id="selectBase">
                                                    <option value="light">Light</option>
                                                    <option value="dark" ${(customBase == "dark") ? "selected" : ""}>Dark</option>
                                                </select>
                                                <div class="form-text w-100">Select the base theme that custom colors will be built upon</div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Background</span>
                                                <input type="text" class="form-control" placeholder="#FFFFFF" value="${customBg}" aria-label="Custom Background Color" id="custombgcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(localStorage['customTheme'] === "true" && localStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Main background color for the website</div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Text</span>
                                                <input type="text" class="form-control" placeholder="#000000" value="${customText}" aria-label="Custom Text Color" id="customtextcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(localStorage['customTheme'] === "true" && localStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Primary text color used throughout the site</div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Links</span>
                                                <input type="text" class="form-control" placeholder="#7ba7ce" value="${customLink}" aria-label="Custom Link Color" id="customlinkcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(localStorage['customTheme'] === "true" && localStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Color for clickable links and hover states</div>
                                            </div>
                                            <div class="input-group">
                                                <span class="input-group-text">Buttons</span>
                                                <input type="text" class="form-control" placeholder="#236DAD" value="${customBtn}" aria-label="Custom Button Color" id="custombtncolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(localStorage['customTheme'] === "true" && localStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Color for interactive buttons and controls</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="settings-section mb-4">
                                <h6 class="settings-heading">
                                    <i class="fas fa-sliders-h me-2"></i>Interface Elements
                                </h6>
                                <div class="card">
                                    <div class="card-body">
                                        <div class="mb-2">
                                            <label class="form-label"><strong>Skin Viewer Controls:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${!hideLayers ? ' active' : ''}" id="hideLayers" data-bs-toggle="tooltip" title="Toggle skin layer visibility controls">
                                                    <i class="fas fa-clone"></i> Layers
                                                </button>
                                                <button type="button" class="btn btn-outline-primary${!hideSkinStealer ? ' active' : ''}" id="hideSkinStealer" data-bs-toggle="tooltip" title="Enable skin download functionality">
                                                    <i class="fas fa-user-secret"></i> Steal Skin
                                                </button>
                                                <button type="button" class="btn btn-outline-primary${!hideElytra ? ' active' : ''}" id="hideElytra" data-bs-toggle="tooltip" title="Show elytra on player model">
                                                    <i class="fas fa-dove"></i> Elytra
                                                </button>
                                            </div>
                                        </div>

                                        <div class="mb-2">
                                            <label class="form-label"><strong>Profile Information:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${!hideCreatedAt ? ' active' : ''}" id="hideCreatedAt" data-bs-toggle="tooltip" title="Show account creation date">Created At</button>
                                                <button type="button" class="btn btn-outline-primary${!hideBadges2 ? ' active' : ''}" id="hideBadges2" data-bs-toggle="tooltip" title="Display profile badges">Badges</button>
                                                <button type="button" class="btn btn-outline-primary${!hideFollowing ? ' active' : ''}" id="hideFollowing" data-bs-toggle="tooltip" title="Show following/follower information">Follows</button>
                                            </div>
                                        </div>

                                        <div class="mb-2">
                                            <label class="form-label"><strong>Cape Settings:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${!hideOptifine ? ' active' : ''}" id="hideOptifine" data-bs-toggle="tooltip" title="Display OptiFine capes">OptiFine</button>
                                                <button type="button" class="btn btn-outline-primary${bedrockCapes ? ' active' : ''}" id="bedrockCapes" data-bs-toggle="tooltip" title="Show Bedrock Edition capes">Bedrock</button>
                                            </div>
                                        </div>

                                        <div>
                                            <label class="form-label"><strong>Additional Features:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${!hideServers ? ' active' : ''}" id="hideServers" data-bs-toggle="tooltip" title="Show favorite servers on profile">Favorite Servers</button>
                                                <button type="button" class="btn btn-outline-primary${!hideHeadCmd2 ? ' active' : ''}" id="hideHeadCmd2" data-bs-toggle="tooltip" title="Display head command">Head Command</button>
                                                <button type="button" class="btn btn-outline-primary${!hideDegreesOfSep2 ? ' active' : ''}" id="hideDegreesOfSep2" data-bs-toggle="tooltip" title="Show degree of separation">Degree of Separation</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="settings-section">
                                <h6 class="settings-heading">
                                    <i class="fas fa-link me-2"></i>Quick Links
                                </h6>
                                <div class="card">
                                    <div class="card-body">
                                        <div>
                                            <label for="linksTextArea" class="form-label">
                                                <strong>External Profile Links:</strong>
                                                <small class="text-muted ms-2">Configure links to external Minecraft profile services</small>
                                            </label>
                                            <textarea class="form-control" id="linksTextArea" rows="3" placeholder="[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})">${linksTextArea}</textarea>
                                            <div class="form-text">Use Markdown format: [Label](URL) with {uuid} and {username} as placeholders</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const createSettingsToggle = (name) => {
            var settingEl = document.querySelector(`#${name}`);
            if (typeof localStorage[name] == "undefined") {
                if (name.startsWith('hide')) localStorage[name] = true;
                else localStorage[name] = false;
            }
            settingEl.onclick = () => {
                settingEl.classList.toggle('active');
                localStorage[name] = settingEl.classList.contains('active');
                globalThis[name] = settingEl.classList.contains('active');
            }
        }

        waitForSelector("[data-bs-theme]", () => {
            if (document.querySelector(".no-js")) return;

            waitForSelector("[href*=namemc]", () => {
                // inject modal html
                document.documentElement.insertAdjacentHTML('beforeend', modalHTML);

                // firefox support
                var customTheme = document.querySelector("#customTheme");
                var lightTheme = document.querySelector("#lightTheme");
                var darkTheme = document.querySelector("#darkTheme");
                var custombgcolor = document.querySelector("#custombgcolor");
                var customtextcolor = document.querySelector("#customtextcolor");
                var customlinkcolor = document.querySelector("#customlinkcolor");
                var custombtncolor = document.querySelector("#custombtncolor");
                var selectBase = document.querySelector("#selectBase");
                var resetcustom = document.querySelector("#resetcustom");
                var exportcustom = document.querySelector("#exportcustom");
                var importcustom = document.querySelector("#importcustom");

                if (typeof localStorage.customBase == "undefined") localStorage.customBase = customBase;

                customTheme.onclick = () => {
                    localStorage.customTheme = true;
                    customThemeOn = true;
                    setCustomTheme();
                }

                lightTheme.onclick = () => {
                    localStorage.customTheme = false;
                    localStorage.theme = "light";
                    customThemeOn = false;
                    document.documentElement.style.removeProperty("--bs-body-bg");
                    document.documentElement.style.removeProperty("--bs-body-color");
                    document.documentElement.style.removeProperty("--ne-link-rgb");
                    document.documentElement.style.removeProperty("--ne-btn-rgb");
                    document.documentElement.classList.remove("customTheme");
                    document.documentElement.setAttribute("data-bs-theme", "light");

                    document.documentElement.style.setProperty("--ne-checkered", "unset");

                    if (customBg == "#12161A" && customText == "#dee2e6") {
                        var iframeEl = document.createElement("iframe");
                        iframeEl.width = 0;
                        iframeEl.height = 0;
                        iframeEl.id = "nmcIf";
                        iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("#EEF0F2");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("#212529");
                        </script>`;
                        document.documentElement.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000)

                        localStorage.customBg = "#EEF0F2";
                        localStorage.customText = "#212529";
                        localStorage.customBase = "light";
                        localStorage.customLink = "#236dad";
                        customBg = "#EEF0F2";
                        customText = "#212529";
                        customBase = "light";
                        customLink = "#236dad";
                        custombgcolor.value = "#EEF0F2";
                        customtextcolor.value = "#212529";
                        selectBase.value = "light";
                        customlinkcolor.value = "#236dad";
                    }
                }

                darkTheme.onclick = () => {
                    localStorage.customTheme = false;
                    localStorage.theme = "dark";
                    customThemeOn = false;
                    document.documentElement.style.removeProperty("--bs-body-bg");
                    document.documentElement.style.removeProperty("--bs-body-color");
                    document.documentElement.style.removeProperty("--ne-link-rgb");
                    document.documentElement.style.removeProperty("--ne-btn-rgb");
                    document.documentElement.classList.remove("customTheme");
                    document.documentElement.setAttribute("data-bs-theme", "dark");

                    document.documentElement.style.setProperty("--ne-checkered", "unset");

                    if (customBg == "#EEF0F2" && customText == "#212529") {
                        var iframeEl = document.createElement("iframe");
                        iframeEl.width = 0;
                        iframeEl.height = 0;
                        iframeEl.id = "nmcIf";
                        iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("#12161A");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("#dee2e6");
                        </script>`;
                        document.documentElement.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000)

                        localStorage.customBg = "#12161A";
                        localStorage.customText = "#dee2e6";
                        localStorage.customBase = "dark";
                        localStorage.customLink = "#7ba7ce";
                        customBg = "#12161A";
                        customText = "#dee2e6";
                        customBase = "dark";
                        customLink = "#7ba7ce";
                        custombgcolor.value = "#12161A";
                        customtextcolor.value = "#dee2e6";
                        selectBase.value = "dark";
                        customlinkcolor.value = "#7ba7ce";
                    }
                }

                custombgcolor.onchange = () => {
                    if (customThemeOn) document.documentElement.style.setProperty("--bs-body-bg", custombgcolor.value);
                    localStorage.customBg = custombgcolor.value;
                    customBg = custombgcolor.value;

                    var rgbBg = hexToRgb(custombgcolor.value);
                    document.documentElement.style.setProperty("--ne-checkered", `rgba(${rgbBg["r"] * 1.75}, ${rgbBg["g"] * 1.75}, ${rgbBg["b"] * 1.75}, .5)`);
                    customTheme.click();
                }

                customtextcolor.onchange = () => {
                    if (customThemeOn) document.documentElement.style.setProperty("--bs-body-color", customtextcolor.value);
                    localStorage.customText = customtextcolor.value;
                    customText = customtextcolor.value;
                    customTheme.click();
                }

                customlinkcolor.onchange = () => {
                    var linkRgb = hexToRgb(customlinkcolor.value);
                    if (customThemeOn) document.documentElement.style.setProperty("--ne-link-rgb", `${linkRgb["r"]}, ${linkRgb["g"]}, ${linkRgb["b"]}`);

                    localStorage.customLink = customlinkcolor.value;
                    customLink = customlinkcolor.value;
                    customTheme.click();
                }

                custombtncolor.onchange = () => {
                    var btnRgb = hexToRgb(custombtncolor.value);
                    if (customThemeOn) document.documentElement.style.setProperty("--ne-btn-rgb", `${btnRgb["r"]}, ${btnRgb["g"]}, ${btnRgb["b"]}`);

                    localStorage.customBtn = custombtncolor.value;
                    customBtn = custombtncolor.value;
                    customTheme.click();
                }

                selectBase.onchange = () => {
                    if (customThemeOn) document.documentElement.setAttribute("data-bs-theme", selectBase.value);
                    localStorage.customBase = selectBase.value;
                    localStorage.theme = selectBase.value;
                    customBase = selectBase.value;
                    customTheme.click();
                }

                resetcustom.onclick = () => {
                    if (confirm("Are you sure you want to reset your custom theme?")) {
                        if (customBase == "dark") {
                            var iframeEl = document.createElement("iframe");
                            iframeEl.width = 0;
                            iframeEl.height = 0;
                            iframeEl.id = "nmcIf";
                            iframeEl.srcdoc = `<script>
                                window.top.document.querySelector("#custombgcolor").jscolor.fromString("#12161A");
                                window.top.document.querySelector("#customtextcolor").jscolor.fromString("#dee2e6");
                                window.top.document.querySelector("#customlinkcolor").jscolor.fromString("#7ba7ce");
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#236DAD");
                            </script>`;
                            document.documentElement.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000)

                            localStorage.customBg = "#12161A";
                            localStorage.customText = "#dee2e6";
                            localStorage.customLink = "#7ba7ce";
                            localStorage.customBtn = "#236DAD";
                            customBg = "#12161A";
                            customText = "#dee2e6";
                            customLink = "#7ba7ce";
                            customBtn = "#236DAD";
                            custombgcolor.value = "#12161A";
                            customtextcolor.value = "#dee2e6";
                            customlinkcolor.value = "#7ba7ce";
                            custombtncolor.value = "#236DAD";
                        } else {
                            var iframeEl = document.createElement("iframe");
                            iframeEl.width = 0;
                            iframeEl.height = 0;
                            iframeEl.id = "nmcIf";
                            iframeEl.srcdoc = `<script>
                                window.top.document.querySelector("#custombgcolor").jscolor.fromString("#EEF0F2");
                                window.top.document.querySelector("#customtextcolor").jscolor.fromString("#212529");
                                window.top.document.querySelector("#customlinkcolor").jscolor.fromString("#236DAD");
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#236DAD");
                            </script>`;
                            document.documentElement.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000)

                            localStorage.customBg = "#EEF0F2";
                            localStorage.customText = "#212529";
                            localStorage.customLink = "#236DAD";
                            localStorage.customBtn = "#236DAD";
                            customBg = "#EEF0F2";
                            customText = "#212529";
                            customLink = "#236DAD";
                            customBtn = "#236DAD";
                            custombgcolor.value = "#EEF0F2";
                            customtextcolor.value = "#212529";
                            customlinkcolor.value = "#236DAD";
                            custombtncolor.value = "#236DAD";
                        }

                        if (customThemeOn) setCustomTheme();
                    }
                    customTheme.click();
                }

                exportcustom.onclick = () => {
                    var code = `${customBg};${customText};${customLink};${customBtn};${customBase == "dark" ? 1 : 0}`;
                    prompt("You can copy this custom theme code below: ", code);
                    customTheme.click();
                }

                importcustom.onclick = () => {
                    var code = prompt("You can paste this custom theme code below: ");

                    if (code) {
                        code = code.split(";");

                        if (code.length == 4 || code.length == 5) {
                            var hexRegex = new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

                            if (customBase == "dark") {
                                if (!hexRegex.test(code[0])) code[0] = "#12161A";
                                if (!hexRegex.test(code[1])) code[1] = "#dee2e6";
                                if (!hexRegex.test(code[2])) code[2] = "#7ba7ce";
                                if (!hexRegex.test(code[3])) code[3] = "#236DAD";
                            } else {
                                if (!hexRegex.test(code[0])) code[0] = "#EEF0F2";
                                if (!hexRegex.test(code[1])) code[1] = "#212529";
                                if (!hexRegex.test(code[2])) code[2] = "#7ba7ce";
                                if (!hexRegex.test(code[3])) code[3] = "#1f6098";
                            }

                            var iframeEl = document.createElement("iframe");
                            iframeEl.width = 0;
                            iframeEl.height = 0;
                            iframeEl.id = "nmcIf";
                            iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("${code[0].replace(/"/g, '')}");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("${code[1].replace(/"/g, '')}");
                            window.top.document.querySelector("#customlinkcolor").jscolor.fromString("${code[2].replace(/"/g, '')}");
                            window.top.document.querySelector("#custombtncolor").jscolor.fromString("${code[3].replace(/"/g, '')}");
                        </script>`;
                            document.documentElement.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000)

                            localStorage.customBg = code[0];
                            localStorage.customText = code[1];
                            localStorage.customLink = code[2];
                            localStorage.customBtn = code[3];
                            customBg = code[0];
                            customText = code[1];
                            customLink = code[2];
                            customBtn = code[3];
                            custombgcolor.value = code[0];
                            customtextcolor.value = code[1];
                            customlinkcolor.value = code[2];
                            custombtncolor.value = code[3];

                            if (code[4] && code[4].length > 0) {
                                if (code[4] == "1") {
                                    localStorage.customBase = "dark";
                                    customBase = "dark";
                                    selectBase.value = "dark";
                                } else {
                                    localStorage.customBase = "light";
                                    customBase = "light";
                                    selectBase.value = "light";
                                }
                            }

                            if (customThemeOn) setCustomTheme();
                        } else {
                            alert("You entered a invalid custom theme code!")
                        }
                    }
                    customTheme.click();
                }

                if (!customThemeOn) {
                    if (document.documentElement.getAttribute("data-bs-theme") == "dark") {
                        darkTheme.onclick();
                    } else {
                        lightTheme.onclick();
                    }
                }

                waitForSelector("[data-jscolor]", () => {
                    setTimeout(() => {
                        var iframeEl = document.createElement("iframe");
                        iframeEl.width = 0;
                        iframeEl.height = 0;
                        iframeEl.id = "nmcIf";
                        iframeEl.srcdoc = `<script>
                            window.top.jscolor.init();
                        </script>`;
                        document.documentElement.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000)
                    }, 1000)
                });

                // PROFILE SETTINGS
                [...document.querySelectorAll("#settingsModal .btn-outline-primary")].forEach(a => createSettingsToggle(a.id));

                var linksTextAreaEl = document.querySelector("#linksTextArea");
                if (typeof localStorage.linksTextArea == "undefined") localStorage.linksTextArea = `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`;
                linksTextAreaEl.onchange = () => {
                    localStorage.linksTextArea = linksTextAreaEl.value;
                    linksTextArea = linksTextAreaEl.value;
                }
            });

            waitForSelector('a[data-bs-theme-value]',
                /**
                 * @param {HTMLElement} themeButton 
                 */
                (themeButton) => {
                    // replace theme button with settings button... should open bootstrap modal
                    themeButton.parentElement.outerHTML = `
                        <li class="nav-item">
                            <a class="nav-link" href="javascript:void(0)" data-bs-toggle="modal" data-bs-target="#settingsModal">
                                <i class="fas fa-cog"></i>
                            </a>
                        </li>
                    `;
                }
            )
        })
    }

    const customPage = (page, name, title, icon) => {
        waitForSelector('[href="/minecraft-skins"]', () => {
            var isPage = location.pathname == "/extras/" + page;
            var storeNavBar = document.querySelector('.nav-link[href="https://store.namemc.com/category/emerald"]').parentElement;
            var customNavRange = document.createRange();
            var customNavHTML = customNavRange.createContextualFragment(`<li class='nav-item'><a class='nav-link${isPage ? " active" : ""}' href='/extras/${page}'>${name}</a></li>`);
            var customNavDropRange = document.createRange();
            var customNavDropHTML = customNavDropRange.createContextualFragment(`<a class='dropdown-item' id='${page}' href='/extras/${page}' title='${name}'><i class="${icon} menu-icon"></i>${name}</a>`);
            storeNavBar.before(customNavHTML);
            waitForSelector('.dropdown-divider:nth-of-type(2)', (dropDivider) => dropDivider.before(customNavDropHTML));

            if (isPage === true) {
                document.title = title + " | NameMC Extras";

                var inject1 = document.createElement('script');
                inject1.src = chrome.runtime.getURL(`pages/${encodeURIComponent(page)}.js`);
                inject1.onload = function () {
                    this.remove();
                };
                (document.head || document.documentElement).appendChild(inject1);

                var inject2 = document.createElement('script');
                inject2.src = chrome.runtime.getURL('js/skinview3d.bundle.js');
                inject2.onload = function () {
                    this.remove();
                };
                (document.head || document.documentElement).appendChild(inject2);

                waitForSelector('#faq', (faq) => {
                    faq.remove()
                });

                document.querySelector('.dropdown-item.active')?.classList.remove('active');
                document.querySelector('#' + page)?.classList.add('active');
            }

            var inject3 = document.createElement('script');
            inject3.src = chrome.runtime.getURL('js/jscolor.min.js');
            inject3.onload = function () {
                this.remove();
            };
            (document.head || document.documentElement).appendChild(inject3);
        })
    }

    const customMenuItem = (id, name, href, location, classes, newTab = false) => {
        waitForSelector('[href="/my-account"]', (myAccountBtn) => {
            var dropDownMenu = myAccountBtn.parentElement;
            var menuItem = document.createElement("a")
            menuItem.classList.add("dropdown-item");
            menuItem.id = id;
            menuItem.href = href;
            menuItem.textContent = name;
            if (classes) {
                var iconEl = document.createElement("i");
                iconEl.setAttribute("class", classes + " menu-icon")

                menuItem.insertBefore(iconEl, menuItem.lastChild);
            }

            if (newTab) {
                menuItem.target = "_blank";
            } else {
                var inject1 = document.createElement('script');
                inject1.src = chrome.runtime.getURL(`dropdown-items/${encodeURIComponent(id)}.js`);
                inject1.type = "module";
                inject1.onload = function () {
                    this.remove();
                };
                (document.head || document.documentElement).appendChild(inject1);
            }

            dropDownMenu.insertBefore(menuItem, dropDownMenu.childNodes[location]);
        })
    }

    const injectPages = (pages, i) => {
        pages.forEach(page => setTimeout(customPage(...page), i))
    }

    const injectMenus = (menus, i) => {
        menus.forEach(menu => setTimeout(customMenuItem(...menu), i))
    }

    // INJECT SETTINGS BUTTON
    createSettingsButton();

    const pages = [
        ['skin-cape-test', 'Tester', 'Skin & Cape Tester', 'fas fa-rectangle-portrait']
    ];

    if (!hideBadges2) pages.push(['badges', 'Badges', 'Badges', 'fas fa-award']);

    // INJECT PAGES
    injectPages(pages);

    // INJECT MENU ITEMS
    injectMenus([
        ['generate-image', 'Generate Image', 'javascript:void(0)', 17, 'far fa-image'],
        ['generate-skinart', 'Generate Skin Art', 'javascript:void(0)', 18, 'far fa-palette']
    ]);

    waitForSelector("body", () => {
        // REPLACE COPY BUTTON
        setTimeout(() => {
            var copyLinks = [...document.querySelectorAll("a.copy-button[data-clipboard-text][href*='javascript:']")];
            copyLinks.forEach(copyLink => {
                copyLink.innerHTML = '<i class="far fa-fw fa-copy"></i>';
                copyLink.classList.add("color-inherit");

                // fix title
                setTimeout(() => copyLink.title = "Copy", 1000)
            });
        }, 5)

        // REMOVE NAME LENGTH RESTRICTIONS
        if (location.pathname === "/minecraft-names") {
            waitForSelector("#name-length", (input) => {
                input.removeAttribute('min');
                input.removeAttribute('max');
            });
        }
    });

    // INJECT CREDITS
    waitForSelector("footer .row", (footer) => {
        var creditsRange = document.createRange();
        var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>Using <a class="text-nowrap" href="https://github.com/NameMC-Extras/NameMC-Extras" target="_blank">NameMC Extras</a></small></div>`);
        footer?.insertBefore(creditsHTML, footer?.lastElementChild)
    });
})()