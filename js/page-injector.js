(async () => {
    if (!document.contentType.startsWith('text/html')) return;
    if (window.location.hostname === 'store.namemc.com') return;

    const root = document.documentElement;

    // bypass anti ad blocker
    var iframeEl = document.createElement("iframe");
    iframeEl.width = 0;
    iframeEl.height = 0;
    iframeEl.style.display = "none";
    iframeEl.srcdoc = `<script>
const patch = (win) => {
    try {
        win.confirm = () => {};
    } catch {}
};

// Patch top window once
patch(window.top);

// Patch existing iframes
const patchIframe = (iframe) => {
    try {
        patch(iframe.contentWindow);
    } catch {}
};

window.top.document.querySelectorAll("iframe").forEach(iframe => {
    patchIframe(iframe);
    iframe.addEventListener("load", () => patchIframe(iframe));
});

// Watch for new iframes
const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
        for (const node of m.addedNodes) {
            if (node.tagName === "IFRAME") {
                patchIframe(node);
                node.addEventListener("load", () => patchIframe(node));
            }
            if (node.querySelectorAll) {
                node.querySelectorAll("iframe").forEach(f => {
                    patchIframe(f);
                    f.addEventListener("load", () => patchIframe(f));
                });
            }
        }
    }
});

observer.observe(window.top.document.documentElement, {
    childList: true,
    subtree: true
});
</script>`;

    document.documentElement.append(iframeEl);

    let currentUrl = location.href;

    let cleanUrl = currentUrl.replace(/\/+$/, '');

    if (currentUrl !== cleanUrl && currentUrl !== location.origin + '/') location.href = cleanUrl;

    const waitForSelector = (
        selector,
        callback,
        { root = document, timeout = 10000, once = true } = {}
    ) => {
        return new Promise((resolve, reject) => {
            const existing = root.querySelector(selector);
            if (existing) {
                callback?.(existing);
                return resolve(existing);
            }

            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue;
                        const el = node.matches(selector) ? node : node.querySelector(selector);
                        if (el) {
                            if (once) observer.disconnect();
                            clearTimeout(timer);
                            callback?.(el);
                            return resolve(el);
                        }
                    }
                }
            });

            observer.observe(root.documentElement || root, { childList: true, subtree: true });

            const timer = timeout && setTimeout(() => {
                observer.disconnect();
                reject(new Error(`waitForSelector timeout: ${selector}`));
            }, timeout);
        });
    };

    const waitForHtmlDataTheme = (callback, { timeout = 10000 } = {}) => {
        return new Promise((resolve, reject) => {
            const html = document.documentElement;

            // Immediate resolve (fast path)
            if (html.hasAttribute("data-bs-theme")) {
                callback?.(html);
                return resolve(html);
            }

            const observer = new MutationObserver(() => {
                if (html.hasAttribute("data-bs-theme")) {
                    observer.disconnect();
                    clearTimeout(timer);
                    callback?.(html);
                    resolve(html);
                }
            });

            observer.observe(html, {
                attributes: true,
                attributeFilter: ["data-bs-theme"]
            });

            const timer = timeout && setTimeout(() => {
                observer.disconnect();
                reject(new Error("waitForHtmlDataTheme timeout"));
            }, timeout);
        });
    };

    await superStorage._ready;

    var theme = superStorage.getItem("theme");
    var customThemeOn = superStorage.getItem("customTheme") === "true";
    var customBg = superStorage.getItem("customBg") || (theme == "dark" ? "#12161A" : "#EEF0F2");
    var customText = superStorage.getItem("customText") || (theme == "dark" ? "#dee2e6" : "#212529");
    var customLink = superStorage.getItem("customLink") || (theme == "dark" ? "#7ba7ce" : "#236dad");
    var customBtn = superStorage.getItem("customBtn") || "#236dad";
    var customBase = superStorage.getItem("customBase") || (theme == "dark" ? "dark" : "light");
    var hideHeadCmd2 = superStorage.getItem("hideHeadCmd2") === "false";
    var hideDegreesOfSep2 = superStorage.getItem("hideDegreesOfSep2") === "false";
    var hideBadges2 = superStorage.getItem("hideBadges2") === "false";
    var pinned = superStorage.getItem("pinned") === "true";
    var hideSkinTester = superStorage.getItem("hideSkinTester") === "false";

    var bedrockCapes = superStorage.getItem("bedrockCapes") === "true";
    var linksTextArea = superStorage.getItem("linksTextArea") ?? `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`;
    var hideCreatedAt = superStorage.getItem("hideCreatedAt") === "false";
    var hideElytra = superStorage.getItem("hideElytra") === "false";
    var hideLayers = superStorage.getItem("hideLayers") === "false";
    var hideSkinStealer = superStorage.getItem("hideSkinStealer") === "false";
    var hideServers = superStorage.getItem("hideServers") === "false";
    var hideFollowing = superStorage.getItem("hideFollowing") === "false";
    var hideOptifine = superStorage.getItem("hideOptifine") === "false";

    // Function to inject user-data-utils and check for pinned users
    const checkPinnedUsers = () => {
        return new Promise((resolve) => {
            // Inject user-data-utils script
            var inject = document.createElement('script');
            inject.src = chrome.runtime.getURL('js/user-data-utils.js');
            inject.onload = function () {
                this.remove();

                // Wait for UserDataUtils to be available
                const waitForUserDataUtils = () => {
                    if (window.UserDataUtils) {
                        const userDataUtils = new UserDataUtils();
                        const pinnedUsers = userDataUtils.getPinnedUsers();
                        resolve(pinnedUsers.length > 0);
                    } else {
                        setTimeout(waitForUserDataUtils, 50);
                    }
                };
                waitForUserDataUtils();
            };
            inject.onerror = function () {
                this.remove();
                resolve(false); // Default to false if script fails to load
            };
            (document.head || root).appendChild(inject);
        });
    };

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function setCustomTheme() {
        try {
            var linkRgb = hexToRgb(customLink);
            var btnRgb = hexToRgb(customBtn);
            root.style.setProperty("--bs-body-bg", customBg);
            root.style.setProperty("--bs-body-color", customText);
            root.style.setProperty("--ne-link-rgb", `${linkRgb["r"]}, ${linkRgb["g"]}, ${linkRgb["b"]}`);
            root.style.setProperty("--ne-btn-rgb", `${btnRgb["r"]}, ${btnRgb["g"]}, ${btnRgb["b"]}`);
            root.setAttribute("data-bs-theme", customBase);
            root.classList.add("customTheme");
            superStorage.theme = customBase;

            var bgRgb = hexToRgb(customBg);
            let multiplier = 1.15;
            let opacity = .5;
            if (customBase === 'dark') {
                multiplier = 1.35;
                opacity = .45;
            }

            root.style.setProperty("--ne-checkered", `rgba(${bgRgb["r"] * multiplier}, ${bgRgb["g"] * multiplier}, ${bgRgb["b"] * multiplier}, ${opacity})`);
        } catch {

        }
    }

    if (customThemeOn) setCustomTheme();
    if (hideHeadCmd2) root.style.setProperty("--head-cmd", hideHeadCmd2 ? 'none' : 'flex');
    if (hideServers) root.style.setProperty("--servers", hideServers ? 'none' : 'flex');
    if (hideFollowing) root.style.setProperty("--following", hideFollowing ? 'none' : 'flex');
    if (hideDegreesOfSep2) root.style.setProperty("--degrees-of-sep", hideDegreesOfSep2 ? 'none' : 'flex');
    if (hideOptifine) root.style.setProperty("--optifine", hideOptifine ? 'none' : 'flex');

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
                                                <input type="text" class="form-control" placeholder="#FFFFFF" value="${customBg}" aria-label="Custom Background Color" id="custombgcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(superStorage['customTheme'] === "true" && superStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Main background color for the website</div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Text</span>
                                                <input type="text" class="form-control" placeholder="#000000" value="${customText}" aria-label="Custom Text Color" id="customtextcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(superStorage['customTheme'] === "true" && superStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Primary text color used throughout the site</div>
                                            </div>
                                            <div class="input-group mb-2">
                                                <span class="input-group-text">Links</span>
                                                <input type="text" class="form-control" placeholder="#7ba7ce" value="${customLink}" aria-label="Custom Link Color" id="customlinkcolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(superStorage['customTheme'] === "true" && superStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
                                                <div class="form-text w-100">Color for clickable links and hover states</div>
                                            </div>
                                            <div class="input-group">
                                                <span class="input-group-text">Buttons</span>
                                                <input type="text" class="form-control" placeholder="#236DAD" value="${customBtn}" aria-label="Custom Button Color" id="custombtncolor" data-jscolor="{previewPosition:'right',borderColor:'#ffffff40',backgroundColor:'${(superStorage['customTheme'] === "true" && superStorage['customBg']) || theme === 'dark' ? '#12161A' : '#EEF0F2'}'}">
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

                                        <div class="mb-2">
                                            <label class="form-label"><strong>Additional Features:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${!hideServers ? ' active' : ''}" id="hideServers" data-bs-toggle="tooltip" title="Show favorite servers on profile">Favorite Servers</button>
                                                <button type="button" class="btn btn-outline-primary${!hideHeadCmd2 ? ' active' : ''}" id="hideHeadCmd2" data-bs-toggle="tooltip" title="Display head command">Head Command</button>
                                                <button type="button" class="btn btn-outline-primary${!hideDegreesOfSep2 ? ' active' : ''}" id="hideDegreesOfSep2" data-bs-toggle="tooltip" title="Show degree of separation">Degree of Separation</button>
                                            </div>
                                        </div>

                                        <div>
                                            <label class="form-label"><strong>Custom Pages:</strong></label>
                                            <div class="btn-group w-100 toggle-group" role="group">
                                                <button type="button" class="btn btn-outline-primary${pinned ? ' active' : ''}" id="pinned" data-bs-toggle="tooltip" title="Enable pinned users page">Pinned Users</button>
                                                <button type="button" class="btn btn-outline-primary${!hideSkinTester ? ' active' : ''}" id="hideSkinTester" data-bs-toggle="tooltip" title="Enable skin tester">Skin Tester</button>
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
                                            <div class="form-text mb-3">Use Markdown format: [Label](URL) with {uuid} and {username} as placeholders</div>
                                            <button style="min-width:6rem" class="btn btn-primary" id="linksTextBtn">Save</button>
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
            if (typeof superStorage[name] == "undefined") {
                if (name.startsWith('hide')) superStorage[name] = true;
                else superStorage[name] = false;
            }
            settingEl.onclick = () => {
                settingEl.classList.toggle('active');
                superStorage[name] = settingEl.classList.contains('active');
                globalThis[name] = settingEl.classList.contains('active');
            }
        }

        waitForHtmlDataTheme(() => {
            if (document.querySelector(".no-js")) return;

            waitForSelector("[href*=namemc]", () => {
                // inject modal html
                root.insertAdjacentHTML('beforeend', modalHTML);

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

                if (typeof superStorage.customBase == "undefined") superStorage.customBase = customBase;

                customTheme.onclick = () => {
                    superStorage.customTheme = true;
                    customThemeOn = true;
                    setCustomTheme();
                }

                lightTheme.onclick = () => {
                    superStorage.customTheme = false;
                    superStorage.theme = "light";
                    customThemeOn = false;
                    root.style.removeProperty("--bs-body-bg");
                    root.style.removeProperty("--bs-body-color");
                    root.style.removeProperty("--ne-link-rgb");
                    root.style.removeProperty("--ne-btn-rgb");
                    root.classList.remove("customTheme");
                    root.setAttribute("data-bs-theme", "light");

                    root.style.setProperty("--ne-checkered", "unset");

                    if (customBg == "#12161A" && customText == "#dee2e6") {
                        var iframeEl = document.createElement("iframe");
                        iframeEl.width = 0;
                        iframeEl.height = 0;
                        iframeEl.style.display = 'none';
                        iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("#EEF0F2");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("#212529");
                        </script>`;
                        root.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000);

                        superStorage.customBg = "#EEF0F2";
                        superStorage.customText = "#212529";
                        superStorage.customBase = "light";
                        superStorage.customLink = "#236dad";
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
                    superStorage.customTheme = false;
                    superStorage.theme = "dark";
                    customThemeOn = false;
                    root.style.removeProperty("--bs-body-bg");
                    root.style.removeProperty("--bs-body-color");
                    root.style.removeProperty("--ne-link-rgb");
                    root.style.removeProperty("--ne-btn-rgb");
                    root.classList.remove("customTheme");
                    root.setAttribute("data-bs-theme", "dark");

                    root.style.setProperty("--ne-checkered", "unset");

                    if (customBg == "#EEF0F2" && customText == "#212529") {
                        var iframeEl = document.createElement("iframe");
                        iframeEl.width = 0;
                        iframeEl.height = 0;
                        iframeEl.style.display = 'none';
                        iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("#12161A");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("#dee2e6");
                        </script>`;
                        root.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000);

                        superStorage.customBg = "#12161A";
                        superStorage.customText = "#dee2e6";
                        superStorage.customBase = "dark";
                        superStorage.customLink = "#7ba7ce";
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
                    if (customThemeOn) root.style.setProperty("--bs-body-bg", custombgcolor.value);
                    superStorage.customBg = custombgcolor.value;
                    customBg = custombgcolor.value;

                    var rgbBg = hexToRgb(custombgcolor.value);
                    root.style.setProperty("--ne-checkered", `rgba(${rgbBg["r"] * 1.75}, ${rgbBg["g"] * 1.75}, ${rgbBg["b"] * 1.75}, .5)`);
                    customTheme.click();
                }

                customtextcolor.onchange = () => {
                    if (customThemeOn) root.style.setProperty("--bs-body-color", customtextcolor.value);
                    superStorage.customText = customtextcolor.value;
                    customText = customtextcolor.value;
                    customTheme.click();
                }

                customlinkcolor.onchange = () => {
                    var linkRgb = hexToRgb(customlinkcolor.value);
                    if (customThemeOn) root.style.setProperty("--ne-link-rgb", `${linkRgb["r"]}, ${linkRgb["g"]}, ${linkRgb["b"]}`);

                    superStorage.customLink = customlinkcolor.value;
                    customLink = customlinkcolor.value;
                    customTheme.click();
                }

                custombtncolor.onchange = () => {
                    var btnRgb = hexToRgb(custombtncolor.value);
                    if (customThemeOn) root.style.setProperty("--ne-btn-rgb", `${btnRgb["r"]}, ${btnRgb["g"]}, ${btnRgb["b"]}`);

                    superStorage.customBtn = custombtncolor.value;
                    customBtn = custombtncolor.value;
                    customTheme.click();
                }

                selectBase.onchange = () => {
                    if (customThemeOn) root.setAttribute("data-bs-theme", selectBase.value);
                    superStorage.customBase = selectBase.value;
                    superStorage.theme = selectBase.value;
                    customBase = selectBase.value;
                    customTheme.click();
                }

                resetcustom.onclick = () => {
                    if (confirm("Are you sure you want to reset your custom theme?")) {
                        if (customBase == "dark") {
                            var iframeEl = document.createElement("iframe");
                            iframeEl.width = 0;
                            iframeEl.height = 0;
                            iframeEl.style.display = 'none';
                            iframeEl.srcdoc = `<script>
                                window.top.document.querySelector("#custombgcolor").jscolor.fromString("#12161A");
                                window.top.document.querySelector("#customtextcolor").jscolor.fromString("#dee2e6");
                                window.top.document.querySelector("#customlinkcolor").jscolor.fromString("#7ba7ce");
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#236DAD");
                            </script>`;
                            root.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000);

                            superStorage.customBg = "#12161A";
                            superStorage.customText = "#dee2e6";
                            superStorage.customLink = "#7ba7ce";
                            superStorage.customBtn = "#236DAD";
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
                            iframeEl.style.display = 'none';
                            iframeEl.srcdoc = `<script>
                                window.top.document.querySelector("#custombgcolor").jscolor.fromString("#EEF0F2");
                                window.top.document.querySelector("#customtextcolor").jscolor.fromString("#212529");
                                window.top.document.querySelector("#customlinkcolor").jscolor.fromString("#236DAD");
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#236DAD");
                            </script>`;
                            root.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000);

                            superStorage.customBg = "#EEF0F2";
                            superStorage.customText = "#212529";
                            superStorage.customLink = "#236DAD";
                            superStorage.customBtn = "#236DAD";
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
                            iframeEl.style.display = 'none';
                            iframeEl.srcdoc = `<script>
                            window.top.document.querySelector("#custombgcolor").jscolor.fromString("${code[0].replace(/"/g, '')}");
                            window.top.document.querySelector("#customtextcolor").jscolor.fromString("${code[1].replace(/"/g, '')}");
                            window.top.document.querySelector("#customlinkcolor").jscolor.fromString("${code[2].replace(/"/g, '')}");
                            window.top.document.querySelector("#custombtncolor").jscolor.fromString("${code[3].replace(/"/g, '')}");
                        </script>`;
                            root.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000);

                            superStorage.customBg = code[0];
                            superStorage.customText = code[1];
                            superStorage.customLink = code[2];
                            superStorage.customBtn = code[3];
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
                                    superStorage.customBase = "dark";
                                    customBase = "dark";
                                    selectBase.value = "dark";
                                } else {
                                    superStorage.customBase = "light";
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
                    if (root.getAttribute("data-bs-theme") == "dark") {
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
                        iframeEl.style.display = 'none';
                        iframeEl.srcdoc = `<script>
                            try {
                                window.top.jscolor.presets.default.format = 'hex';
                                window.top.jscolor.presets.default.alpha = false;
                                window.top.jscolor.init();
                            } catch {}
                        </script>`;
                        root.append(iframeEl);
                        setTimeout(() => iframeEl.remove(), 1000);
                    }, 1000);
                });

                // PROFILE SETTINGS
                [...document.querySelectorAll("#settingsModal .btn-outline-primary")].forEach(a => createSettingsToggle(a.id));

                var linksTextAreaEl = document.querySelector("#linksTextArea");
                var linksTextBtn = document.querySelector("#linksTextBtn");
                if (typeof superStorage.linksTextArea == "undefined") superStorage.linksTextArea = `[capes.me](https://capes.me/{uuid}), [LABY](https://laby.net/@{uuid}), [Livz](https://livzmc.net/user/{uuid}), [25Karma](https://25karma.xyz/player/{uuid}), [Crafty](https://crafty.gg/players/{uuid})`;
                linksTextBtn.onclick = () => {
                    superStorage.linksTextArea = linksTextAreaEl.value;
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

            if (isPage) {
                document.title = title + " | NameMC Extras";

                var inject1 = document.createElement('script');
                inject1.src = chrome.runtime.getURL(`pages/${encodeURIComponent(page)}.js`);
                inject1.onload = function () {
                    this.remove();
                };
                (document.head || root).appendChild(inject1);

                var inject2 = document.createElement('script');
                inject2.src = chrome.runtime.getURL('js/skinview3d.bundle.js');
                inject2.onload = function () {
                    this.remove();
                };
                (document.head || root).appendChild(inject2);

                if (page === 'pinned') {
                    var inject3 = document.createElement('script');
                    inject3.src = chrome.runtime.getURL('js/user-data-utils.js');
                    inject3.onload = function () {
                        this.remove();
                    };
                    (document.head || root).appendChild(inject3);
                }

                waitForSelector('#faq', (faq) => {
                    faq.remove()
                });

                document.querySelector('.dropdown-menu > .active')?.classList.remove('active');
                document.querySelector('#' + page)?.classList.add('active');
            }
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
                (document.head || root).appendChild(inject1);
            }

            dropDownMenu.insertBefore(menuItem, dropDownMenu.childNodes[location]);
        })
    }

    const injectPages = (pages, delay = 0) => {
        pages.forEach(page => {
            setTimeout(() => customPage(...page), delay);
        });
    };

    const injectMenus = (menus, delay = 0) => {
        menus.forEach(menu => {
            setTimeout(() => customMenuItem(...menu), delay);
        });
    };

    var inject3 = document.createElement('script');
    inject3.src = chrome.runtime.getURL('js/jscolor.min.js');
    inject3.onload = function () {
        this.remove();
    };
    (document.head || root).appendChild(inject3);

    // INJECT SETTINGS BUTTON
    createSettingsButton();

    // Initialize pages with basic pages
    const initializePages = async () => {
        const pages = [];

        if (!hideSkinTester) {
            pages.push(['skin-cape-test', 'Tester', 'Skin & Cape Tester', 'fas fa-rectangle-portrait']);
        }

        if (pinned) {
            const hasPinnedUsers = await checkPinnedUsers();
            if (hasPinnedUsers) {
                pages.push(['pinned', 'Pinned', 'Pinned Users', 'fas fa-thumbtack']);
            }
        }

        if (!hideBadges2) {
            pages.push(['badges', 'Badges', 'Badges', 'fas fa-award']);
        }

        // INJECT PAGES
        injectPages(pages);
    };

    // Initialize pages asynchronously
    initializePages();

    // INJECT MENU ITEMS
    injectMenus([
        ['generate-image', 'Generate Image', 'javascript:void(0)', 17, 'far fa-image'],
        ['generate-skinart', 'Generate Skin Art', 'javascript:void(0)', 18, 'far fa-palette']
    ]);

    waitForSelector("body", async () => {
        // REPLACE COPY BUTTON
        waitForSelector("a.copy-button[data-clipboard-text][href*='javascript:']", () => {
            var copyLinks = [...document.querySelectorAll("a.copy-button[data-clipboard-text][href*='javascript:']")];
            copyLinks.forEach(copyLink => {
                copyLink.innerHTML = '<i class="far fa-fw fa-copy"></i>';
                copyLink.classList.add("color-inherit");

                // fix title
                setTimeout(() => copyLink.title = "Copy", 1000);
            });
        });

        // REMOVE NAME LENGTH RESTRICTIONS
        if (location.pathname === "/minecraft-names") {
            waitForSelector("#name-length", (input) => {
                input.removeAttribute('min');
                input.removeAttribute('max');
            });
        }

        if (pinned) {
            const hasPinnedUsers = await checkPinnedUsers();
            if (hasPinnedUsers) {
                if (location.pathname === "/search") {
                    waitForSelector(".mono", (search) => {
                        if (search.innerText?.trim()?.toLowerCase() === "tierlist") {
                            search.onclick = () => {
                                location.href = "/extras/pinned?tierlist=true";
                            }
                            search.style.cursor = "pointer";
                            search.style.textDecoration = "underline";
                        }
                    });
                }
            }
        }

        // MARK ALL READ
        waitForSelector('.dropdown-header:nth-child(6)', async (header) => {
            header.insertAdjacentHTML('beforeend', `<a href="javascript:void 0" id="markAllRead" class="color-inherit" title="Mark All Read"><i class="far fa-envelope-open"></i></a>`);
            const currProfile = document.querySelector('.dropdown-menu > [style] > .dropdown-item.active')?.href;
            const profiles = [...document.querySelectorAll('[href*="%2Ffollowers%3Fsort%3Ddate%3Adesc"]')].map(a => a.href);
            const currURL = document.querySelector('[href*="/followers?sort=date:desc"]').href;

            const modalHTML = `
            <div class="modal fade" id="captchaModal" tabindex="-1" role="dialog" aria-labelledby="captchaModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg" role="document" style="max-width:300px">
                    <div class="modal-content">
                        <div class="modal-body">
                            <iframe src="${currURL}" id="captchaIf"></iframe>
                        </div>
                    </div>
                </div>
            </div>`;

            root.insertAdjacentHTML('beforeend', modalHTML);

            const fetchAllProfiles = async () => {
                document.querySelector('#markAllRead').classList.add('disabled');
                root.style.cursor = 'wait';

                for (const url of profiles) {
                    await fetch(url);
                }

                await fetch(currProfile);
            }

            document.querySelector('#markAllRead').onclick = async () => {
                const curr = await fetch(currURL);
                if (curr.status === 403) {
                    var iframeEl = document.createElement("iframe");
                    iframeEl.width = 0;
                    iframeEl.height = 0;
                    iframeEl.style.display = 'none';
                    iframeEl.srcdoc = `<script>
                        window.top.captchaModal = new window.top.bootstrap.Modal("#captchaModal");
                        window.top.captchaModal.show();
                    </script>`;
                    root.append(iframeEl);
                    setTimeout(() => iframeEl.remove(), 1000);

                    setTimeout(() => {
                        document.querySelector('#captchaIf').contentWindow.addEventListener('visibilitychange', async () => {
                            var iframeEl = document.createElement("iframe");
                            iframeEl.width = 0;
                            iframeEl.height = 0;
                            iframeEl.style.display = 'none';
                            iframeEl.srcdoc = `<script>
                                window.top.captchaModal.hide();
                            </script>`;
                            root.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000);
                            await fetchAllProfiles();
                            location.reload();
                        });
                    }, 1000);
                    return;
                }

                await fetchAllProfiles();
                location.reload();
            }
        })
    });

    // INJECT CREDITS
    waitForSelector("footer .row", (footer) => {
        var creditsRange = document.createRange();
        var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>Using <a class="text-nowrap" href="https://github.com/NameMC-Extras/NameMC-Extras" target="_blank">NameMC Extras</a></small></div>`);
        footer?.insertBefore(creditsHTML, footer?.lastElementChild)
    });
})()