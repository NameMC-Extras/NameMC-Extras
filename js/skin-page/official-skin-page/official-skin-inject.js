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
  waitForSelector('[value=like]', (likeBtn) => {
    if (!document.querySelector("#steal-btn")) {
      var stealBtn = document.createElement('button');
      stealBtn.id = 'steal-btn';
      stealBtn.setAttribute('class', 'btn btn-secondary p-0 m-1')
      stealBtn.classList.add('p-0');

      // lazy to make the steal button make the heart btn move
      stealBtn.setAttribute('style', `width:36px;height:36px`)
      stealBtn.title = "Steal Skin";
      stealIcon = document.createElement('i');
      stealIcon.classList.add('fas');
      stealIcon.classList.add('fa-user-secret');
      stealBtn.innerHTML = stealIcon.outerHTML;
      likeBtn.parentElement.parentElement.before(stealBtn);

      document.querySelector('#steal-btn').onclick = () => {
        const url = `${location.origin}/extras/skin-cape-test?skin=${location.pathname.split("/").slice(-1)[0].split("?")[0]}`;
        window.location.href = url;
      }
    }
  });
}

/*
 * CLASSES
 */

createStealBtn();
