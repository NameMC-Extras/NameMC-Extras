/* copyright 2022 | Faav#6320 | github.com/bribes */
function endsWithNumber(str) {
  return /[0-9]+$/.test(str);
}

if (endsWithNumber(location.pathname)) {

  const waitForUUID = function (callback) {
    if (document.querySelector('.order-lg-2')) {
      callback();
    } else {
      setTimeout(function () {
        waitForUUID(callback);
      }, 1);
    }
  };

  window.addEventListener("message", (json) => {
    if (typeof json.data.at !== 'undefined') {
      var creationDate = json.data.cd;
      var accountType = json.data.at;
      acctype.innerHTML = accountType;
      if (creationDate !== 'null') {
        cdate.innerHTML = `${new Date(creationDate).toLocaleDateString()} <sup>(Can be inaccurate)</sup>`;
      } else {
        cdate.innerHTML = 'Not Found!';
      }
    }
  });

  waitForUUID(async () => {
    var uuid = document.querySelector('.order-lg-2').innerText;
    var colorRGB = window.getComputedStyle(document.body).getPropertyValue("background-color");
    var views = document.querySelector('.card-body > :nth-child(3)');
    var color = '363642';

    if (colorRGB == 'rgb(25, 25, 39)') {
      color = 'd6d8e1';
    }

    views.outerHTML += `
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Account Type</strong></div>
    <div id="acctype" class="col-auto">?</div>
  </div>
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Creation Date</strong></div>
    <div id="cdate" class="col-auto">?</div>
  </div>
  `

    var gadgetIf = document.createElement('iframe');
    gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}/${color}?url=${location.href}`;
    gadgetIf.id = 'nmcIf';

    document.body.append(gadgetIf);
  });
}
