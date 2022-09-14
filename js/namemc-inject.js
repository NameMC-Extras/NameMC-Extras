/* copyright 2022 | Faav#6320 | github.com/bribes */
function endsWithNumber(str) {
  return /[0-9]+$/.test(str);
}

if (endsWithNumber(location.pathname) && location.pathname) {
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
    if (typeof json.data.accountType !== 'undefined') {
      var creationDate = json.data.creationDate;
      var accountType = json.data.accountType;
      var tooltip = json.data.tooltip;
      acctype.innerHTML = accountType;
      $('#acctype').tooltip({"placement":"top","boundary":"viewport","title":tooltip});
      if (creationDate !== 'null') {
        cdate.innerHTML = `${new Date(creationDate).toLocaleDateString()} <i id="warningcd" class="fas fa-exclamation-circle"></i>`;
        $('#warningcd').tooltip({"placement":"top","boundary":"viewport","title":"Creation dates are inaccurate for a lot of accounts due to a breaking change on Mojang's end. We are currently fetching dates from Ashcon's API. Please yell at Mojang (WEB-3367) in order for accurate creation dates to return."});
      } else {
        cdate.innerHTML = 'Not Found!';
      }
    }
  });

  waitForUUID(async () => {
    var username = document.querySelector('.text-nowrap[translate=no]').innerText;
    var uuid = document.querySelector('.order-lg-2').innerText;
    var views = document.querySelector('.card-body > :nth-child(3)');

    views.outerHTML += `
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Account Type</strong></div>
    <div id="acctype" class="col-auto">Loading... <i class="fal fa-spinner icon-spin"></i></div>
  </div>
  <div class="row no-gutters">
    <div class="col col-lg-4"><strong>Creation Date</strong></div>
    <div id="cdate" class="col-auto">Loading... <i class="fal fa-spinner icon-spin"></i></div>
  </div>
  <div class="row no-gutters">
    <div class="col order-lg-1 col-lg-4"><strong>mcuserna.me</strong></div>
    <div class="col-auto order-lg-3 col-lg-auto text-nowrap text-right"><a class="copy-button" href="javascript:void(0)" data-clipboard-text="mcuserna.me/${uuid}" onclick="return false">Copy</a></div>
    <div class="col-12 order-lg-2 col-lg"><a href="https://mcuserna.me/${uuid}" rel="nofollow">mcuserna.me/${username}</a></div>
  </div>
  `

    var gadgetIf = document.createElement('iframe');
    gadgetIf.src = `https://gadgets.faav.top/namemc-info/${uuid}?url=${location.href}`;
    gadgetIf.id = 'nmcIf';

    document.body.append(gadgetIf);
  });
}
