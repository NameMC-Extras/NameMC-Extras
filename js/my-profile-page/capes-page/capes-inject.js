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

        const timer = timeout && setTimeout(() => {
            observer.disconnect();
            reject(new Error(`waitForSelector timeout: ${selector}`));
        }, timeout);

        const observer = new MutationObserver(mutations => {
            for (let i = 0; i < mutations.length; i++) {
                const nodes = mutations[i].addedNodes;
                for (let j = 0; j < nodes.length; j++) {
                    const node = nodes[j];
                    if (node.nodeType !== 1) continue;

                    if (node.matches(selector)) {
                        if (once) observer.disconnect();
                        clearTimeout(timer);
                        callback?.(node);
                        return resolve(node);
                    }

                    const found = node.querySelector(selector);
                    if (found) {
                        if (once) observer.disconnect();
                        clearTimeout(timer);
                        callback?.(found);
                        return resolve(found);
                    }
                }
            }
        });

        observer.observe(root.documentElement || root, { childList: true, subtree: true });
    });
};

waitForSelector('.card.my-3', (capesEl) => {
    let capes = [...capesEl.querySelectorAll('[class*=fa-toggle-]')].map(a => a.classList.contains('fa-toggle-on'));
    let capeValues = [...capesEl.querySelectorAll('[class*=fa-toggle-]')].map(a => a.parentElement.value);
    let hasTrue = capes.some(a => a);
    if (!capes.length) return;
    capesEl.querySelector('.card-header').innerHTML = `<div class="row">
            <div class="col">
                <strong>Capes</strong>
            </div>
            <div class="col-auto">
                <a class="px-1" id="hideAll"><i class="far fa-toggle-${hasTrue ? 'on' : 'off'}"></i></a>
            </div>
        </div>`;


    document.querySelector('#hideAll').onclick = async () => {
        document.querySelector('#hideAll').classList.add('disabled');
        document.documentElement.style.cursor = 'wait';
        const datas = capes
            .map((a, i) => ({ value: a, cape: capeValues[i] }))
            .filter(({ value }) => value === hasTrue)
            .map(({ cape }) => {
                const formData = new URLSearchParams();
                formData.append("task", "toggle-cape");
                formData.append("cape", cape);

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