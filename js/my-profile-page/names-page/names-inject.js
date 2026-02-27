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

waitForSelector('.card.mt-3', (historyEl) => {
    let history = [...historyEl.querySelectorAll('[class*=fa-toggle-]')].map(a => a.classList.contains('fa-toggle-on'));
    let hasTrue = history.some(a => a);
    historyEl.insertAdjacentHTML('afterbegin', `<div class="card-header py-1">
        <div class="row">
            <div class="col">
                <strong>Name History</strong>
            </div>
            ${history.length ? `<div class="col-auto">
                <a class="px-1" id="hideAll"><i class="far fa-toggle-${hasTrue ? 'on' : 'off'}"></i></a>
            </div>` : ''}
        </div>
    </div>`);

    if (!history.length) return;

    document.querySelector('#hideAll').onclick = async () => {
        document.querySelector('#hideAll').classList.add('disabled');
        document.documentElement.style.cursor = 'wait';
        const datas = history
            .map((a, i) => ({ value: a, index: i }))
            .filter(({ value }) => value === hasTrue)
            .map(({ index }) => {
                const formData = new URLSearchParams();
                formData.append("task", "toggle-name-visibility");
                formData.append("name_index", history.length - index);

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