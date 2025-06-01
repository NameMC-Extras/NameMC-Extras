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
    historyEl.insertAdjacentHTML('afterbegin', `<div class="card-header py-1">
        <div class="row">
            <div class="col">
                <strong>Name History</strong>
            </div>
            ${history.length ? `<div class="col-auto">
                <a class="px-1" id="hideAll"><i class="far fa-toggle-${history.includes(true) ? 'on' : 'off'}"></i></a>
            </div>` : ''}
        </div>
    </div>`);

    document.querySelector('#hideAll').onclick = () => {
        if (history.includes(true)) {
            history = history.filter(a => a);
        } else {
            history = history.filter(a => !a)
        }

        const datas = history.map((_, index) => {
            const formData = new URLSearchParams();
            formData.append("task", "toggle-name-visibility");
            formData.append("name_index", history.length - index);

            return formData.toString();
        });

        Promise.all(datas.map(formData => fetch("https://namemc.com/my-profile/names", {
            method: "POST",
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }))).then(() => location.reload());
    }
});