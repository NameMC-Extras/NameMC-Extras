console.log("Injecting skin page...");

const waitForSelector = function (selector, callback) {
  query = document.querySelector(selector)
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


const createStealBtn = () => {
  waitForSelector('button > .fa-heart', (likeIcon) => {
    if (!document.querySelector("#steal-btn")) {
      let stealBtn = document.createElement('button');
      stealBtn.id = 'steal-btn';
      stealBtn.setAttribute('class', 'btn btn-secondary p-0 m-1')
      stealBtn.classList.add('p-0');

      // lazy to make the steal button make the heart btn move
      stealBtn.setAttribute('style', `width:36px;height:36px`)
      stealBtn.title = "Steal Skin";
      let stealIcon = document.createElement('i');
      stealIcon.classList.add('fas');
      stealIcon.classList.add('fa-user-secret');
      stealBtn.innerHTML = stealIcon.outerHTML;
      likeIcon.parentElement.parentElement.parentElement.before(stealBtn);

      let skinCanvas = document.querySelector('canvas');
      let currentSkinId = skinCanvas.dataset.id;
      let currentDataModel = skinCanvas.dataset.model;

      document.querySelector('#steal-btn').onclick = () => {
        const queryParams = [];
        if (currentSkinId) queryParams.push(`skin=${currentSkinId}`);
        if (currentDataModel) queryParams.push(`model=${currentDataModel}`);
        const url = `${location.origin}/extras/skin-cape-test?${queryParams.join('&')}`;
        window.location.href = url;
      }
    }
  });
}

/*
 * CLASSES
 */

createStealBtn();
