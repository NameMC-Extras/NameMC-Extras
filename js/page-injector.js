/* copyright 2024 | Faav#6320 | github.com/bribes */
(async () => {
    const waitForSelector = function (selector, callback) {
        query = document.querySelector(selector)
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

    var theme = localStorage.getItem("theme");
    var customThemeOn = (localStorage.getItem("customTheme") == "true");
    var customBg = localStorage.getItem("customBg") || (theme == "dark" ? "#12161A" : "#EEF0F2");
    var customText = localStorage.getItem("customText") || (theme == "dark" ? "#dee2e6" : "#212529");
    var customLink = localStorage.getItem("customLink") || "#7ba7ce";
    var customBtn = localStorage.getItem("customBtn") || "#848BB0";
    var customBase = localStorage.getItem("customBase") || (theme == "dark" ? "dark" : "light");

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
        document.documentElement.style.setProperty("--ne-checkered", `rgba(${bgRgb["r"] * 1.75}, ${bgRgb["g"] * 1.75}, ${bgRgb["b"] * 1.75}, .5)`);
    }

    if (customThemeOn) setCustomTheme()

    const createSettingsButton = () => {
        const modalHTML = `
            <div class="modal fade" id="settingsModal" tabindex="-1" role="dialog" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="settingsModalLabel">Extras Settings</h5>
                            <button type="button" class="btn" data-bs-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <label for="theme" class="form-label">Theme</label>
                            <div class="btn-group w-100" role="group" aria-label="Theme">
                                <button type="button" class="btn btn-light" data-bs-theme-value="light" id="lightTheme">
                                    <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/2600-fe0f.svg" alt="☀️">
                                    Light
                                </button>
                                <button type="button" class="btn btn-dark" data-bs-theme-value="dark" id="darkTheme">
                                    <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/1f319.svg" alt=" ">
                                    Dark
                                </button>
                                <button type="button" class="btn btn-secondary" id="customTheme">
                                    <img class="emoji" draggable="false" src="https://raw.githubusercontent.com/googlefonts/noto-emoji/41e31b110b4eb929dffb410264694a06205b7ad7/svg/emoji_u1f308.svg" alt=" ">
                                    Custom
                                </button>
                            </div>
                            <br>
                            <br>
                            <label for="customTheme" class="form-label" style="display:flex;">
                                Custom Theme
                                <a class="color-inherit" title="Reset back to base colors" style="margin-left:.3rem" id="resetcustom" href="javascript:void(0)">
                                    <i class="fas fa-fw fa-undo-alt"></i>
                                </a>
                                <a class="color-inherit" title="Export custom theme" style="margin-left:.3rem" id="exportcustom" href="javascript:void(0)">
                                    <i class="fas fa-fw fa-download"></i>
                                </a>
                                <a class="color-inherit" title="Import custom theme" style="margin-left:.3rem" id="importcustom" href="javascript:void(0)">
                                    <i class="fas fa-fw fa-upload"></i>
                                </a>
                            </label>
                            <div class="input-group mb-3">
                                <span class="input-group-text">Base Theme</span>
                                <select class="form-select" id="selectBase">
                                    <option value="light">Light</option>
                                    <option value="dark" ${(customBase == "dark") ? "selected" : ""}>Dark</option>
                                </select>
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text">Background Color</span>
                                <input type="text" class="form-control" placeholder="#FFFFFF" value="${customBg}" aria-label="Custom Background Color" id="custombgcolor" data-jscolor="{previewPosition:'right'}" >
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text">Text Color</span>
                                <input type="text" class="form-control" placeholder="#000000" value="${customText}" aria-label="Custom Text Color" id="customtextcolor" data-jscolor="{previewPosition:'right'}" >
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text">Link Color</span>
                                <input type="text" class="form-control" placeholder="#7ba7ce" value="${customLink}" aria-label="Custom Link Color" id="customlinkcolor" data-jscolor="{previewPosition:'right'}" >
                            </div>
                            <div class="input-group mb-3">
                                <span class="input-group-text">Button Color</span>
                                <input type="text" class="form-control" placeholder="#848BB0" value="${customBtn}" aria-label="Custom Button Color" id="custombtncolor" data-jscolor="{previewPosition:'right'}" >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        waitForSelector("[data-bs-theme]", () => {
            waitForSelector("html", () => {
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

                if (typeof localStorage.customBase == "undefined") {
                    localStorage.customBase = customBase;
                }

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
                        customBg = "#EEF0F2";
                        customText = "#212529";
                        customBase = "light";
                        custombgcolor.value = "#EEF0F2";
                        customtextcolor.value = "#212529";
                        selectBase.value = "light";
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
                        customBg = "#12161A";
                        customText = "#dee2e6";
                        customBase = "dark";
                        custombgcolor.value = "#12161A";
                        customtextcolor.value = "#dee2e6";
                        selectBase.value = "dark";
                    }
                }

                custombgcolor.onchange = () => {
                    if (customThemeOn) document.documentElement.style.setProperty("--bs-body-bg", custombgcolor.value);
                    localStorage.customBg = custombgcolor.value;
                    customBg = custombgcolor.value;

                    var rgbBg = hexToRgb(custombgcolor.value);
                    document.documentElement.style.setProperty("--ne-checkered", `rgba(${rgbBg["r"] * 1.75}, ${rgbBg["g"] * 1.75}, ${rgbBg["b"] * 1.75}, .5)`);
                }

                customtextcolor.onchange = () => {
                    if (customThemeOn) document.documentElement.style.setProperty("--bs-body-color", customtextcolor.value);
                    localStorage.customText = customtextcolor.value;
                    customText = customtextcolor.value;
                }

                customlinkcolor.onchange = () => {
                    var linkRgb = hexToRgb(customlinkcolor.value);
                    if (customThemeOn) document.documentElement.style.setProperty("--ne-link-rgb", `${linkRgb["r"]}, ${linkRgb["g"]}, ${linkRgb["b"]}`);

                    localStorage.customLink = customlinkcolor.value;
                    customLink = customlinkcolor.value;
                }

                custombtncolor.onchange = () => {
                    var btnRgb = hexToRgb(custombtncolor.value);
                    if (customThemeOn) document.documentElement.style.setProperty("--ne-btn-rgb", `${btnRgb["r"]}, ${btnRgb["g"]}, ${btnRgb["b"]}`);

                    localStorage.customBtn = custombtncolor.value;
                    customBtn = custombtncolor.value;
                }

                selectBase.onchange = () => {
                    if (customThemeOn) document.documentElement.setAttribute("data-bs-theme", selectBase.value);
                    localStorage.customBase = selectBase.value;
                    localStorage.theme = selectBase.value;
                    customBase = selectBase.value;
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
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#848BB0");
                            </script>`;
                            document.documentElement.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000)

                            localStorage.customBg = "#12161A";
                            localStorage.customText = "#dee2e6";
                            localStorage.customLink = "#7ba7ce";
                            localStorage.customBtn = "#848BB0";
                            customBg = "#12161A";
                            customText = "#dee2e6";
                            customLink = "#7ba7ce";
                            customBtn = "#848BB0";
                            custombgcolor.value = "#12161A";
                            customtextcolor.value = "#dee2e6";
                            customlinkcolor.value = "#7ba7ce";
                            custombtncolor.value = "#848BB0";
                        } else {
                            var iframeEl = document.createElement("iframe");
			    iframeEl.width = 0;
			    iframeEl.height = 0;
			    iframeEl.id = "nmcIf";
                            iframeEl.srcdoc = `<script>
                                window.top.document.querySelector("#custombgcolor").jscolor.fromString("#EEF0F2");
                                window.top.document.querySelector("#customtextcolor").jscolor.fromString("#212529");
                                window.top.document.querySelector("#customlinkcolor").jscolor.fromString("#7ba7ce");
                                window.top.document.querySelector("#custombtncolor").jscolor.fromString("#848BB0");
                            </script>`;
                            document.documentElement.append(iframeEl);
                            setTimeout(() => iframeEl.remove(), 1000)

                            localStorage.customBg = "#EEF0F2";
                            localStorage.customText = "#212529";
                            localStorage.customLink = "#7ba7ce";
                            localStorage.customBtn = "#848BB0";
                            customBg = "#EEF0F2";
                            customText = "#212529";
                            customLink = "#7ba7ce";
                            customBtn = "#848BB0";
                            custombgcolor.value = "#EEF0F2";
                            customtextcolor.value = "#212529";
                            customlinkcolor.value = "#7ba7ce";
                            custombtncolor.value = "#848BB0";
                        }

                        if (customThemeOn) setCustomTheme();
                    }
                }

                exportcustom.onclick = () => {
                    var code = `${customBg};${customText};${customLink};${customBtn};${customBase == "dark" ? 1 : 0}`;
                    prompt("You can copy this custom theme code below: ", code)
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
                            if (!hexRegex.test(code[3])) code[3] = "#848BB0";
                        } else {
                            if (!hexRegex.test(code[0])) code[0] = "#EEF0F2";
                            if (!hexRegex.test(code[1])) code[1] = "#212529";
                            if (!hexRegex.test(code[2])) code[2] = "#7ba7ce";
                            if (!hexRegex.test(code[3])) code[3] = "#848BB0";
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
                })
            })

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
            var customNavHTML = customNavRange.createContextualFragment(`<li class='nav-item'><a class='nav-link ${isPage ? "active" : ""}' href='/extras/${page}'>${name}</a></li>`);
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

    const customMenuItem = (id, name, href, location, classes) => {
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

            dropDownMenu.insertBefore(menuItem, dropDownMenu.childNodes[location]);

            var inject1 = document.createElement('script');
            inject1.src = chrome.runtime.getURL(`dropdown-items/${encodeURIComponent(id)}.js`);
            inject1.onload = function () {
                this.remove();
            };
            (document.head || document.documentElement).appendChild(inject1);
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

    // INJECT PAGES
    injectPages([
        ['skin-cape-test', 'Tester', 'Skin & Cape Tester', 'fas fa-rectangle-portrait'],
        ['badges', 'Badges', 'Badges', 'fas fa-award']
    ]);

    // INJECT MENU ITEMS
    injectMenus([
        ['generate-image', 'Generate Image', 'javascript:void(0)', 17, 'far fa-image']
    ])

    // REPLACE COPY BUTTON
    waitForSelector("body", () => {
        var copyLinks = [...document.querySelectorAll("a")].filter(a => a.innerText == "Copy");
        copyLinks.forEach(copyLink => {
            copyLink.innerHTML = '<i class="far fa-fw fa-copy"></i>';
            copyLink.classList.add("color-inherit");

            // fix title
            setTimeout(() => copyLink.title = "Copy", 10000)
        });
    })

    // INJECT CREDITS
    waitForSelector("footer .row", (footer) => {
        var creditsRange = document.createRange();
        var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>Using <a class="text-nowrap" href="https://github.com/NameMC-Extras/NameMC-Extras" target="_blank">NameMC Extras</a></small></div>`);
        footer?.insertBefore(creditsHTML, footer?.lastElementChild)
    });

})()
