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

// Credits
waitForSelector("footer .row", (footer) => {
    var creditsRange = document.createRange();
    var creditsHTML = creditsRange.createContextualFragment(`<div class="col-6 col-sm-4 col-lg py-1"><small>NameMC Extras by <a class="text-nowrap" href="https://github.com/bribes" target="_blank">Faav</a></small></div>`);
    footer?.insertBefore(creditsHTML, footer?.lastElementChild)
});

const customPage = (page, name, icon) => {
    waitForSelector('[href="/minecraft-skins"]', async () => {
        var isPage = new URLSearchParams(window.parent.location.search).get('page') == page;
        var capeDropNav = document.querySelector('a.dropdown-item[href="/capes"]');
        var capeNavBar = document.querySelector('.nav-link[href="/capes"]').parentElement;
        var customNavRange = document.createRange();
        var customNavHTML = customNavRange.createContextualFragment(`<li class='nav-item'><a class='nav-link ${isPage ? "active" : ""}' href='https://${window.parent.location.host}/?page=${page}'>${name}</a></li>`);
        var customNavDropRange = document.createRange();
        var customNavDropHTML = customNavDropRange.createContextualFragment(`<a class='dropdown-item' id='${page}' href='https://${window.parent.location.host}/?page=${page}' title='${name}'><i class="${icon}"></i>${name}</a>`);
        capeNavBar.appendChild(customNavHTML);
        capeDropNav.after(customNavDropHTML);
        
        if (isPage === true) {
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

            document.querySelector('.dropdown-item.active').classList.remove('active');
            document.querySelector('#' + page).classList.add('active');
        }
    })
}

customPage('skin-cape-test', 'Tester', 'fas fa-rectangle-portrait menu-icon')
