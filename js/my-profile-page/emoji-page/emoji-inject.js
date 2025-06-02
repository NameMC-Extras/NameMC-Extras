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

const disabled = [
    '1f451',
    '1f48d',
    '1f48e',
    '1f4b0',
    '1f4b8',
    '1f4b3',
    '1f3b5',
    '1f3b6',
    '1f6ac',
    '1f351',
    '1f346',
    '1f595',
    '1f4b2',
    '1f51e',
    '1f4af',
    '1f911',
    '1f30d',
    '1f30e',
    '1f30f'
]

const blocked = [
    '00ae',
    '00a9'
]

waitForSelector('.nav.mt-3', (navEl) => {
    navEl.insertAdjacentHTML('beforebegin', `<form>
        <div class="input-group input-group-lg">
            <input id="emoji-search" class="form-control" type="search" name="emoji" placeholder="Search Emojis" autocomplete="off" spellcheck="false">
            <button class="btn btn-primary" id="searchEmoji" type="submit" title="Search"><i class="far fa-search"></i></button>
        </div>
    </form>`);

    const subCats = document.querySelector('.nav.nav-tabs');
    const emojisForm = document.querySelector('main form[method=POST]');

    const capitalizeWords = (str) => {
        return str
            .toLowerCase()
            .split(/[\s-]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('-');
    }

    const parseEmoji = (emoji) => {
        const emojiPresentationRegex = /\p{Emoji_Presentation}/u;
        return emojiPresentationRegex.test(emoji.split('-').map(a => String.fromCodePoint(parseInt(a, 16))).join('')) ? emoji : emoji + '-fe0f';
    };

    async function searchEmoji(query) {
        if (subCats) [...subCats.querySelectorAll('.active')].forEach(cat => cat.classList.remove('active'));
        emojisForm.innerHTML = '<div id="emojiBox" class="text-center row g-2 justify-content-center mb-3"></div>';

        let container = document.querySelector('#emojiBox');

        if (query.length < 3) {
            container.innerHTML = 'Please enter at least 3 characters'
            return;
        }
        const emojiSearchAPI = await fetch(`https://cors.faav.top/emojis?search=${encodeURIComponent(query)}`);

        if (emojiSearchAPI.status === 200) {
            let emojiJSON = await emojiSearchAPI.json();
            emojiJSON = emojiJSON.filter(a => a.unicode < 15 && !blocked.includes(a.hexcode));

            if (emojiJSON.length) {
                container.innerHTML = '';
                emojiJSON.forEach(emoji => {
                    container.insertAdjacentHTML('beforeend', `<div class="col-6 col-md-4 col-lg-2">
        <div class="card">
          <button type="submit" class="btn p-0" style="height: initial !important;" name="emoji" value="${parseEmoji(emoji.hexcode)}"${disabled.includes(emoji.hexcode.split('-')[0]) ? ' disabled' : ''}>
            <div class="card-header text-center text-nowrap text-ellipsis py-1" translate="no">${capitalizeWords(emoji.annotation)}</div>
            <div class="position-relative text-center p-4">
<img style="width: 80px; height: 80px;" class="emoji" draggable="false" src="https://s.namemc.com/img/emoji/twitter/${parseEmoji(emoji.hexcode)}.svg" alt="${emoji.emoji}">                <div class="position-absolute top-0 start-0 m-1"><img src="https://s.namemc.com/img/emerald-32.png" title="Available to Emerald Members"></div>
            </div>
          </button>
        </div>
      </div>`)
                });
            } else {
                container.innerHTML = 'No emoji(s) found'
            }
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('emoji');

    if (query) {
        document.querySelector('#emoji-search').value = query;
        searchEmoji(query)
    }
});