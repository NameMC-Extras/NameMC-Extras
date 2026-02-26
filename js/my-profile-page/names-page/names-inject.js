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