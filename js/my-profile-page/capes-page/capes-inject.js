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

waitForSelector('.card.my-3', (capesEl) => {
    let capes = [...capesEl.querySelectorAll('[class*=fa-toggle-]')].map(a => a.classList.contains('fa-toggle-on'));
    let capeValues = [...capesEl.querySelectorAll('[class*=fa-toggle-]')].map(a => a.parentElement.value);
    let hasTrue = capes.some(a => a === true);
    if (capes.length) {
        capesEl.querySelector('.card-header').innerHTML = `<div class="row">
            <div class="col">
                <strong>Capes</strong>
            </div>
            <div class="col-auto">
                <a class="px-1" id="hideAll"><i class="far fa-toggle-${hasTrue ? 'on' : 'off'}"></i></a>
            </div>
        </div>`;
    }

    document.querySelector('#hideAll').onclick = () => {
        document.querySelector('#hideAll').classList.add('disabled');
        const datas = capes
            .map((a, i) => ({ value: a, cape: capeValues[i] }))
            .filter(({ value }) => value === hasTrue)
            .map(({ cape }) => {
                const formData = new URLSearchParams();
                formData.append("task", "toggle-cape");
                formData.append("cape", cape);

                return formData.toString();
            });

        Promise.all(datas.map(formData => fetch("https://namemc.com/my-profile/capes", {
            method: "POST",
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }))).then(() => location.reload());
    }
});