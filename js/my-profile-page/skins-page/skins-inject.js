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

waitForSelector('.card.mb-3', async (skinsEl) => {
    const skins = [];

    const response = await fetch('/my-profile/skins?show_hidden=true');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let lastPage = 1;
    const lastPageEl = doc.querySelector('.fa-angle-double-right');
    if (lastPageEl) lastPage = parseInt(lastPageEl.parentElement.href.split('page=').at(-1));

    const extractSkins = (doc, skipFirst = false) => {
        const card = doc.querySelector('.card.mb-3');
        if (!card) return [];
        const toggles = [...card.querySelectorAll('[class*=fa-toggle-]')];
        if (skipFirst) toggles.shift();
        return toggles.map(a => ({
            value: a.classList.contains('fa-toggle-on'),
            skin: a.parentElement.value
        }));
    };

    skins.push(...extractSkins(doc, true));

    const fetches = [];
    for (let i = 2; i <= lastPage; i++) {
        fetches.push(
            fetch(`/my-profile/skins?show_hidden=true&page=${i}`, {
                headers: {
                    'Cache-Control': 'no-cache'
                },
                cache: "no-store"
            })
                .then(res => res.text())
                .then(html => parser.parseFromString(html, 'text/html'))
                .then(doc => extractSkins(doc))
        );
    }

    const results = await Promise.all(fetches);
    results.forEach(pageSkins => skins.push(...pageSkins));

    const hasTrue = skins.some(a => a.value === true);
    if (!skins.length) return;
    skinsEl.querySelector('.col-auto').insertAdjacentHTML('afterbegin', `<a class="px-1" id="hideAll"><i class="far fa-toggle-${hasTrue ? 'on' : 'off'}"></i></a>`);

    document.querySelector('#hideAll').onclick = () => {
        document.querySelector('#hideAll').classList.add('disabled');
        const datas = skins
            .filter(({ value }) => value === hasTrue)
            .map(({ skin }) => {
                const formData = new URLSearchParams();
                formData.append("task", "toggle-skin");
                formData.append("skin", skin);
                return formData.toString();
            });

        Promise.all(datas.map(formData => fetch(location.href, {
            method: "POST",
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache' 
            },
            cache: "no-store"
        }))).then(() => location.reload());
    };
});