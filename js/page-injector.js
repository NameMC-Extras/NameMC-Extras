/* copyright 2024 | Faav#6320 | github.com/bribes */
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

const customPage = (page, name, title, icon) => {
    waitForSelector('[href="/minecraft-skins"]', async () => {
        var isPage = location.pathname == "/extras/" + page;
        var capeNavBar = document.querySelector('.nav-link[href="/capes"]').parentElement;
        var customNavRange = document.createRange();
        var customNavHTML = customNavRange.createContextualFragment(`<li class='nav-item'><a class='nav-link ${isPage ? "active" : ""}' href='https://${window.parent.location.host}/extras/${page}'>${name}</a></li>`);
        var customNavDropRange = document.createRange();
        var customNavDropHTML = customNavDropRange.createContextualFragment(`<a class='dropdown-item' id='${page}' href='https://${window.parent.location.host}/extras/${page}' title='${name}'><i class="${icon}"></i>${name}</a>`);
        capeNavBar.appendChild(customNavHTML);
        waitForSelector('a.dropdown-item[href="/capes"]', (capeDropNav) => capeDropNav.after(customNavDropHTML));

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
    })
}

const customMenuItem = (id, name, href, location, icon) => {
    waitForSelector('[href="/my-account"]', async (myAccountBtn) => {
        var dropDownMenu = myAccountBtn.parentElement;
        var menuItem = document.createElement("a")
        menuItem.classList.add("dropdown-item");
        menuItem.id = id;
        menuItem.href = href;
        menuItem.innerHTML = `${icon ? `<i class="${icon} menu-icon"></i>` : ""}${name}`
        dropDownMenu.insertBefore(menuItem, dropDownMenu.childNodes[location]);

        var inject1 = document.createElement('script');
        inject1.src = chrome.runtime.getURL(`dropdown-items/${id}.js`);
        inject1.onload = function () {
            this.remove();
        };
        (document.head || document.documentElement).appendChild(inject1);
    })
}

// INJECTING PAGES

customPage('skin-cape-test', 'Tester', 'Skin & Cape Tester', 'fas fa-rectangle-portrait menu-icon')

// INJECTING MENU ITEMS

customMenuItem('generate-image', 'Generate Image', 'javascript:void(0)', 17, 'far fa-image')

// INJECT SUPABASE

var supabaseInject1 = document.createElement("script");
supabaseInject1.src = chrome.runtime.getURL('js/supabase.bundle.js');
supabaseInject1.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(supabaseInject1);
var supabaseInject2 = document.createElement("script");
supabaseInject2.src = chrome.runtime.getURL('js/supabase-manager.js');
supabaseInject2.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(supabaseInject2);

// Credits
waitForSelector("footer .row", (footer) => {
    var creditsRange = document.createRange();
    var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>Using <a class="text-nowrap" href="https://chromewebstore.google.com/detail/cpphfojhgkppblcdhjbcploikanimgek" target="_blank">NameMC Extras</a></small></div>`);
    footer?.insertBefore(creditsHTML, footer?.lastElementChild)
});
