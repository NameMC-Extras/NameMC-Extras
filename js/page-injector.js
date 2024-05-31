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

    var theme = localStorage.getItem("theme");
    var customThemeOn = (localStorage.getItem("customTheme") == "true");
    var customBg = localStorage.getItem("customBg") || (theme == "light" ? "#EEF0F2" : "#12161A");
    var customText = localStorage.getItem("customText") || (theme == "light" ? "#212529" : "#dee2e6");

    waitForSelector("html", (html) => {
        if (document.documentElement.getAttribute("data-bs-theme") == "light") {
            localStorage.theme = "light";
        } else {
            localStorage.theme = "dark";
        }

        if (customThemeOn) {
            html.classList.add("customTheme");
        }
    });

    const createSettingsButton = () => {
        const modalHTML = `
            <div class="modal fade" id="settingsModal" tabindex="-1" role="dialog" aria-labelledby="settingsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="settingsModalLabel">Settings</h5>
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
                                    <img class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/google/1f319.svg" alt="🌙">
                                    Dark
                                </button>
                                <button type="button" class="btn btn-secondary" id="customTheme">
                                    <img class="emoji" draggable="false" src="https://raw.githubusercontent.com/googlefonts/noto-emoji/41e31b110b4eb929dffb410264694a06205b7ad7/svg/emoji_u1f308.svg" alt="🌈">
                                    Custom
                                </button>
                            </div>
                            <br>
                            <br>
                            <label for="customTheme" class="form-label">Custom Theme</label>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" aria-label="Custom Theme Base" id="custombase">
                                <span class="input-group-text" id="basic-addon2">Base</span>
                            </div>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" placeholder="#FFFFFF" value="${customBg}" aria-label="Custom Background Color" id="custombgcolor" data-jscolor>
                                <span class="input-group-text" id="basic-addon2">Background Color</span>
                            </div>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" placeholder="#000000" value="${customText}" aria-label="Custom Text Color" id="customtextcolor" data-jscolor>
                                <span class="input-group-text" id="basic-addon2">Text Color</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        waitForSelector("[data-bs-theme]", () => {
            waitForSelector("body", () => {
                // inject modal html
                document.body.insertAdjacentHTML('beforeend', modalHTML);
    
                if (customThemeOn) {
                    document.body.style.setProperty("--bs-body-bg", custombgcolor.value);
                    document.body.style.setProperty("--bs-body-color", customtextcolor.value);
                }
    
                customTheme.onclick = () => {
                    localStorage.customTheme = true;
                    customThemeOn = true;
                    document.body.style.setProperty("--bs-body-bg", custombgcolor.value);
                    document.body.style.setProperty("--bs-body-color", customtextcolor.value);
                    document.documentElement.classList.add("customTheme");
                }
    
                lightTheme.onclick = () => {
                    localStorage.customTheme = false;
                    customThemeOn = false;
                    document.body.style.removeProperty("--bs-body-bg");
                    document.body.style.removeProperty("--bs-body-color");
                    document.documentElement.classList.remove("customTheme");
    
                    if (customBg == "#12161A" && customText == "#dee2e6") {
                        customBg = "#EEF0F2";
                        customText = "#212529";
                        custombgcolor.value = "#EEF0F2";
                        customtextcolor.value = "#212529";
                    }
                }
    
                darkTheme.onclick = () => {
                    localStorage.customTheme = false;
                    customThemeOn = false;
                    document.body.style.removeProperty("--bs-body-bg");
                    document.body.style.removeProperty("--bs-body-color");
                    document.documentElement.classList.remove("customTheme");
    
                    if (customBg == "#EEF0F2" && customText == "#212529") {
                        customBg = "#12161A";
                        customText = "#dee2e6";
                        custombgcolor.value = "#12161A";
                        customtextcolor.value = "#dee2e6";
                    }
                }
    
                custombgcolor.onchange = () => {
                    if (customThemeOn) document.body.style.setProperty("--bs-body-bg", custombgcolor.value);
                    localStorage.customBg = custombgcolor.value;
                    customBg = custombgcolor.value;
                }
    
                customtextcolor.onchange = () => {
                    if (customThemeOn) document.body.style.setProperty("--bs-body-color", customtextcolor.value);
                    localStorage.customText = customtextcolor.value;
                    customText = customtextcolor.value;
                }
            })
    
            // get element in following path (settings button): nav (single) -> ul (last) -> li (last)
            waitForSelector('[data-bs-theme-value]',
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
    
            waitForFunc("JSColor", () => {
                customBgColor = new JSColor('#custombgcolor', {
                    format: 'hex'
                });
    
                customTextColor = new JSColor('#customtextcolor', {
                    format: 'hex'
                });
            });
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
                inject1.src = chrome.runtime.getURL(`pages/${page}.js`);
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
            inject1.src = chrome.runtime.getURL(`dropdown-items/${id}.js`);
            inject1.onload = function () {
                this.remove();
            };
            (document.head || document.documentElement).appendChild(inject1);
        })
    }

    // INJECT SETTINGS BUTTON

    createSettingsButton();

    // INJECTING PAGES

    customPage('skin-cape-test', 'Tester', 'Skin & Cape Tester', 'fas fa-rectangle-portrait')
    customPage('badges', 'Badges', 'Badges', 'fas fa-award')

    // INJECTING MENU ITEMS

    customMenuItem('generate-image', 'Generate Image', 'javascript:void(0)', 17, 'far fa-image')

    // Credits

    waitForSelector("footer .row", (footer) => {
        var creditsRange = document.createRange();
        var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>Using <a class="text-nowrap" href="https://github.com/NameMC-Extras/NameMC-Extras" target="_blank">NameMC Extras</a></small></div>`);
        footer?.insertBefore(creditsHTML, footer?.lastElementChild)
    });

})()
