console.log("Injecting skin page...");

/*
 * UNIVERSAL VARIABLES
 */
const hideSkinStealer = localStorage.getItem("hideSkinStealer") === "false";

/*
 * HELPERS
 */
const waitForSelector = (selector, callback) => {
  const check = () => {
    const el = document.querySelector(selector);
    if (el) {
      callback(el);
    } else {
      requestAnimationFrame(check);
    }
  };
  check();
};

/*
 * MAIN
 */
const createStealBtn = () => {
  if (hideSkinStealer) return;

  waitForSelector('a > .fa-arrow-alt-to-bottom', (likeIcon) => {
    if (document.getElementById("steal-btn")) return;

    const stealBtn = document.createElement('button');
    stealBtn.id = 'steal-btn';
    stealBtn.className = 'btn btn-secondary p-0 m-1';
    stealBtn.style.width = '36px';
    stealBtn.style.height = '36px';
    stealBtn.title = "Steal Skin";

    const stealIcon = document.createElement('i');
    stealIcon.className = 'fas fa-user-secret';
    stealBtn.appendChild(stealIcon);

    likeIcon.parentElement.parentElement.before(stealBtn);

    const skinCanvas = document.querySelector('canvas');
    const currentSkinId = skinCanvas?.dataset.id;
    const currentDataModel = skinCanvas?.dataset.model;

    stealBtn.onclick = () => {
      const queryParams = [];
      if (currentSkinId) queryParams.push(`skin=${currentSkinId}`);
      if (currentDataModel) queryParams.push(`model=${currentDataModel}`);

      const url = `${location.origin}/extras/skin-cape-test?${queryParams.join('&')}`;
      window.location.href = url;
    };
  });
};

const waitForFunc = function (func, callback) {
  if (window[func] ?? window.wrappedJSObject?.[func]) {
    setTimeout(() => {
      callback(window[func] ?? window.wrappedJSObject?.[func]);
    });
  } else {
    setTimeout(() => {
      waitForFunc(func, callback);
    });
  }
};

const addHolidayTools = () => {
  const hasTools = document.querySelector('[value="hat-santa"]') || document.querySelector('[value="hat-pumpkin-mask-1"]');
  if (!hasTools) {
    waitForSelector('[action="/transform-skin"]', (form) => {
      const skinId = form.querySelector('canvas[data-id]')?.getAttribute('data-id');

      form.insertAdjacentHTML('beforebegin', `
      <form class="d-flex flex-wrap justify-content-center p-1" method="POST" action="https://namemc.com/transform-skin">
        <input type="hidden" name="skin" value="${skinId}">
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin" title="Pumpkin Head">
            <img class="skin-2d" src="https://s.namemc.com/2d/skin/face.png?id=dcec6ffd1405d8cb&scale=4" width="32" height="32">
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-creeper" title="Pumpkin Head (Creeper)">
            <img class="skin-2d" src="https://s.namemc.com/2d/skin/face.png?id=a65fbd99e7d84995&scale=4" width="32" height="32">
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-mask-1" title="Pumpkin Mask #1">
            <canvas class="skin-2d d-block" data-id="${skinId}" data-head="da2a87844a21457b" width="32" height="32"></canvas>
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-mask-2" title="Pumpkin Mask #2">
            <canvas class="skin-2d d-block" data-id="${skinId}" data-head="d3c77a19e1038d4f" width="32" height="32"></canvas>
        </button>
        <div class="col-12 d-none d-md-block"></div>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-mask-3" title="Pumpkin Mask #3">
            <canvas class="skin-2d d-block" data-id="${skinId}" data-head="b556a38d0082a5ab" width="32" height="32"></canvas>
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-mask-4" title="Pumpkin Mask #4">
            <canvas class="skin-2d d-block" data-id="${skinId}" data-head="dc4f431c01153e3b" width="32" height="32"></canvas>
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-pumpkin-mask-5" title="Pumpkin Mask #5">
            <canvas class="skin-2d d-block" data-id="${skinId}" data-head="dded880a92d541f0" width="32" height="32"></canvas>
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-skeleton-mask-1" title="Skeleton Mask">
            <img class="skin-2d" src="https://s.namemc.com/2d/skin/face.png?id=5dafebb887cfc5bb&scale=4" width="32" height="32">
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-spider-mask-1" title="Spider Mask">
            <img class="skin-2d" src="https://s.namemc.com/2d/skin/face.png?id=a89342a07fe40015&scale=4" width="32" height="32">
        </button>
        <button class="btn btn-outline-secondary m-1 p-1" style="height: auto" type="submit" name="transformation" value="hat-santa" title="Santa Hat">
          <canvas class="skin-2d d-block" data-id="${skinId}" data-head="659771ecfb902f62" width="32" height="32"></canvas>
        </button>
      </form>
      <hr class="my-0">
    `);
    });

    waitForFunc('nmci', () => {
      [...document.querySelectorAll('[data-head]')].forEach(head => {
        const script = document.createElement("script");
        script.src = "https://s.namemc.com/i/" + head.getAttribute("data-head") + ".js";
        script.defer = true;
        document.head.appendChild(script);
      });
    });
  }
}

addHolidayTools();
createStealBtn();