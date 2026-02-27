const waitForSelector = (
    selector,
    callback,
    {
        root = document,
        timeout = 10000,
        once = true
    } = {}
) => {
    return new Promise((resolve, reject) => {
        const existing = root.querySelector(selector);
        if (existing) {
            callback?.(existing);
            return resolve(existing);
        }

        const observer = new MutationObserver(() => {
            const el = root.querySelector(selector);
            if (!el) return;

            if (once) observer.disconnect();
            callback?.(el);
            resolve(el);
        });

        observer.observe(root.documentElement || root, {
            childList: true,
            subtree: true
        });

        if (timeout) {
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`waitForSelector timeout: ${selector}`));
            }, timeout);
        }
    });
};

const waitForStorage = function (key, callback) {
    if (window.superStorage && window.superStorage.getItem(key) && window.superStorage.getItem(key).length != 0) {
        setTimeout(() => {
            callback();
        });
    } else {
        setTimeout(() => {
            waitForStorage(key, callback);
        });
    }
};

const capitalizeWords = (str) => {
    return str
        .split(/(\s|-)/)
        .slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

const getEmojiVersion = (unicodeName) => {
    const match = unicodeName.match(/E(\d+\.\d+)/);
    return match ? parseFloat(match[1]) : null;
}

const parseEmoji = (emoji) => {
    if (emoji.startsWith('00')) emoji = emoji.replace('00', '')
    return emoji.toLowerCase().split(' ').join('-');
}

const blacklist = [
    '00ae'
];

var isFree = false;

waitForStorage('supabase_data', () => waitForSelector('.nav.mt-3', async (navEl) => {
    const supabase_data = JSON.parse(superStorage.getItem("supabase_data"));
    const disabled = supabase_data['emojis_disabled'];
    const free = supabase_data['emojis_free'];
    const noEmerald = !!document.querySelector('.alert');
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('search');
    isFree = urlParams.get('filter') === 'free';

    navEl.insertAdjacentHTML('beforebegin', `<form id="emojiSearch">
        <div class="input-group input-group-lg">
            <select id="filterDropdown" class="form-select bg-body-tertiary" name="filter">
                <option value="all"${!isFree ? ' selected' : ''}>All</option>
                <option value="free"${isFree ? ' selected' : ''}>Free</option>
            </select>
            <input id="emoji-search" class="form-control" type="search" name="search" placeholder="Search Emojis" autocomplete="off" spellcheck="false">
            <button class="btn btn-primary" id="searchEmoji" type="submit" title="Search"><i class="far fa-search"></i></button>
        </div>
    </form>`);

    const cats = document.querySelector('.nav.mt-3');
    const subCats = document.querySelector('.nav.nav-tabs');
    const emojisForm = document.querySelector('main form[method=POST]');

    document.getElementById('emojiSearch').addEventListener("formdata", (e) => {
        const entries = [...e.formData.entries()];
        for (let i = 0; i < entries.length; i++) {
            const [key, value] = entries[i];
            if (key === "filter" && value === "all") {
                e.formData.delete(key);
            }
        }
    });

    if (typeof query === 'string') {
        document.querySelector('#emoji-search').value = query;

        if (subCats) {
            subCats.remove();
            emojisForm.insertAdjacentHTML('beforebegin', '<hr class="mt-0">')
        }
        if (cats) [...cats.querySelectorAll('.active')].forEach(cat => cat.classList.remove('active'));
        emojisForm.innerHTML = '<div id="emojiBox" class="text-center row g-2 justify-content-center mb-3"></div>';

        let container = document.querySelector('#emojiBox');
        container.innerHTML = '<p class="text-muted text-center">? results</p>';

        const emojiSearchAPI = await fetch(`https://cors.faav.top/emojis?search=${encodeURIComponent(query)}`);

        if (emojiSearchAPI.status === 200) {
            let emojiJSON = await emojiSearchAPI.json();
            if (emojiJSON.status === 'error') emojiJSON = [];

            // free flags
            free.push(...new Set(emojiJSON.filter(a => a.subGroup == 'country-flag').map(a => parseEmoji(a.codePoint).split('-')[0])));

            emojiJSON = emojiJSON.filter(a => getEmojiVersion(a.unicodeName) < 15 && a.group !== 'component' && !blacklist.includes(a.codePoint.toLowerCase().split(' ')[0]));
            if (isFree) emojiJSON = emojiJSON.filter(a => free.includes(a.codePoint.toLowerCase().split(' ')[0]));

            if (emojiJSON.length > 500) {
                container.innerHTML = '<p class="text-muted text-center">1 – 500 of ' + emojiJSON.length.toLocaleString() + ' results</p>';
                emojiJSON.length = 500;
            } else {
                container.innerHTML = '<p class="text-muted text-center">' + emojiJSON.length.toLocaleString() + ' results</p>';
            }

            if (emojiJSON.length) {
                emojiJSON.forEach(emoji => {
                    container.insertAdjacentHTML('beforeend', `<div class="col-6 col-md-4 col-lg-2">
        <div class="card">
          <button type="submit" class="btn p-0" style="height: initial !important;" name="emoji" value="${parseEmoji(emoji.codePoint)}"${disabled.includes(emoji.codePoint.toLowerCase().split(' ')[0]) || (noEmerald && !free.includes(emoji.codePoint.toLowerCase().split(' ')[0])) ? ' disabled' : ''}>
            <div class="card-header text-center text-nowrap text-ellipsis py-1" translate="no">${capitalizeWords(emoji.unicodeName)}</div>
            <div class="position-relative text-center p-4">
                <img style="width: 80px; height: 80px;" class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/twitter/${parseEmoji(emoji.codePoint).toLowerCase().split(' ').join('-')}.svg" alt="${emoji.character}">
                <div class="position-absolute top-0 start-0 m-1"><img src="https://s.namemc.com/img/${free.includes(emoji.codePoint.toLowerCase().split(' ')[0]) ? 'egg' : 'emerald'}-32.png" title="Available to ${free.includes(emoji.codePoint.toLowerCase().split(' ')[0]) ? 'Everyone' : 'Emerald Members'}"></div>
            </div>
          </button>
        </div>
      </div>`)
                });
            }
        }
    }
}));