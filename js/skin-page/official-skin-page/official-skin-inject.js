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

createStealBtn();