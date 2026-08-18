const waitForSelector = (
    selector,
    callback,
    { root = document, timeout = 60000, once = true } = {}
) => {
    return new Promise((resolve, reject) => {
        const existing = root.querySelector(selector);
        if (existing) {
            callback?.(existing);
            return resolve(existing);
        }

        const timer = timeout && setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);

        const observer = new MutationObserver(() => {
            // Re-scan the full selector from the root on any DOM change. Checking only
            // the added node misses ancestor / :has() / :nth-child selectors, which
            // made injected UI intermittently fail to appear until a refresh.
            const found = root.querySelector(selector);
            if (!found) return;
            if (once) observer.disconnect();
            clearTimeout(timer);
            callback?.(found);
            resolve(found);
        });

        observer.observe(root.documentElement || root, { childList: true, subtree: true });
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

    const batch = async (tasks, concurrency = 3) => {
        const results = [];
        for (let i = 0; i < tasks.length; i += concurrency) {
            const chunk = tasks.slice(i, i + concurrency);
            results.push(...await Promise.all(chunk.map(fn => fn())));
        }
        return results;
    };

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

    const pageTasks = [];
    for (let i = 2; i <= lastPage; i++) {
        pageTasks.push(() =>
            fetch(`/my-profile/skins?show_hidden=true&page=${i}`, {
                headers: { 'Cache-Control': 'no-cache' },
                cache: "no-store"
            })
                .then(res => res.text())
                .then(html => parser.parseFromString(html, 'text/html'))
                .then(doc => extractSkins(doc))
        );
    }

    const results = await batch(pageTasks, 3);
    results.forEach(pageSkins => skins.push(...pageSkins));

    const hasTrue = skins.some(a => a.value);

    document.querySelector('#hideAll').onclick = async () => {
        const toToggle = skins.filter(({ value }) => value === hasTrue);
        const total = toToggle.length;
        if (!total) return;

        document.querySelector('#hideAll').classList.add('disabled');

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);

        const modal = document.createElement('div');
        modal.className = 'modal fade show d-block';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content">
                    <div class="modal-body text-center py-4">
                        <div class="mb-2"><strong>${hasTrue ? 'Hiding' : 'Showing'} skins...</strong></div>
                        <div class="progress mb-2" style="height: 20px">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" id="skinProgressBar" style="width: 0%"></div>
                        </div>
                        <small class="text-muted" id="skinProgressText">0 / ${total}</small>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const bar = document.querySelector('#skinProgressBar');
        const text = document.querySelector('#skinProgressText');
        let done = 0;

        const toggleTasks = toToggle.map(({ skin }) => () => {
            const formData = new URLSearchParams();
            formData.append("task", "toggle-skin");
            formData.append("skin", skin);
            return fetch(location.href, {
                method: "POST",
                body: formData.toString(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache'
                },
                cache: "no-store"
            }).then(res => {
                done++;
                const pct = Math.round((done / total) * 100);
                bar.style.width = pct + '%';
                text.textContent = `${done} / ${total}`;
                return res;
            });
        });

        await batch(toggleTasks, 3);

        bar.classList.remove('progress-bar-animated');
        text.textContent = 'Done! Reloading...';
        location.reload();
    }
});