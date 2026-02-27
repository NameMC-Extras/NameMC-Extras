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

waitForSelector('.card.mb-3', async (skinsEl) => {
    const skins = [];
    const parser = new DOMParser();

    const currentUrl = new URL(location.href);
    const showHidden = currentUrl.searchParams.get('show_hidden') === 'true';
    const doc = showHidden
        ? document
        : await fetch('/my-profile/skins?show_hidden=true').then(res => res.text()).then(html => parser.parseFromString(html, 'text/html'));

    let lastPage = 1;
    const lastPageEl = doc.querySelector('.fa-angle-double-right');
    if (lastPageEl) lastPage = parseInt(lastPageEl.parentElement.href.split('page=').at(-1));

    skins.push(...extractSkins(doc, true));

    if (!skins.length) return;

    const visibleDoc = !showHidden
        ? document
        : await fetch('/my-profile/skins?show_hidden=false').then(res => res.text()).then(html => parser.parseFromString(html, 'text/html'));

    let visibleSkins = extractSkins(visibleDoc, true);

    skinsEl.querySelector('.col-auto').insertAdjacentHTML('afterbegin', `<a class="px-1" id="hideAll"><i class="far fa-toggle-${visibleSkins.length ? 'on' : 'off'}"></i></a>`);

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

    const hasTrue = skins.some(a => a.value);

    document.querySelector('#hideAll').onclick = async () => {
        document.querySelector('#hideAll').classList.add('disabled');
        document.documentElement.style.cursor = 'wait';
        const datas = skins
            .filter(({ value }) => value === hasTrue)
            .map(({ skin }) => {
                const formData = new URLSearchParams();
                formData.append("task", "toggle-skin");
                formData.append("skin", skin);
                return formData.toString();
            });

        await Promise.all(datas.map(formData => fetch(location.href, {
            method: "POST",
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            cache: "no-store"
        })));

        location.reload();
    }
});