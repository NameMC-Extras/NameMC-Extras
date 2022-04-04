/* copyright 2022 | Faav#6320 | github.com/bribes */
(function() {
    if (document.body == null) document.body = document.createElement('body');
    document.documentElement.style = 'height: 100%;width: 100%;display: flex;align-items: center;justify-content: center;align-content: center;';
    document.body.innerHTML = '';
    document.body.style = 'height: 100%;width: 100%;display: flex;align-items: center;justify-content: center;align-content: center;margin: 0;';

    var addThemeRange = document.createRange();
    var addThemeHTML = addThemeRange.createContextualFragment(`<iframe name="add_theme" srcdoc='<script>
  /* grabs cookie to get theme */
  function getCookie(name) {
    let cookies = Object.fromEntries(window.parent.document.cookie.split(";").map(e => e.split("=").map(e => decodeURIComponent(e.trim()))));
    return cookies[name];
  }
  if (getCookie("theme")) {
    if (getCookie("theme") == "dark") {
      window.parent.document.body.style.background = "#191927";
      window.parent.document.body.style.color = "#fff";
    } else {
      window.parent.document.body.style.background = "#f6f7f9";
      window.parent.document.body.style.color = "#363642";
    }
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      window.parent.document.body.style.background = "#191927";
      window.parent.document.body.style.color = "#fff";
  } else {
      window.parent.document.body.style.background = "#f6f7f9";
      window.parent.document.body.style.color = "#363642";
  }
</script>' style='display:none;'></iframe>`);
    document.body.appendChild(addThemeHTML);

    var loaderRange = document.createRange();
    var loaderHTML = loaderRange.createContextualFragment(`<iframe id="loader_if" srcdoc='<html style="height:100%;"><head>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
</head>
<body style="height: 100%;width: 100%;display: flex;align-items: center;justify-content: center;align-content: center;">
<div class="spinner-border" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
<script>
  /* grabs cookie to get theme */
  function getCookie(name) {
    let cookies = Object.fromEntries(window.parent.document.cookie.split(";").map(e => e.split("=").map(e => decodeURIComponent(e.trim()))));
    return cookies[name];
  }
  if (getCookie("theme")) {
    if (getCookie("theme") == "dark") {
      document.body.style.background = "#191927";
      document.body.style.color = "#fff";
    } else {
      document.body.style.background = "#f6f7f9";
      document.body.style.color = "#363642";
    }
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.style.background = "#191927";
      document.body.style.color = "#fff";
  } else {
      document.body.style.background = "#f6f7f9";
      document.body.style.color = "#363642";
  }
</script>
</body>
</html>' style="width: 100%;height: 100%;border: none;"></iframe>`);
    document.body.appendChild(loaderHTML);

    (async function() {
        /* loads namemc iframe */
        var mainRange = document.createRange();
        var mainHTML = mainRange.createContextualFragment(`<iframe id="namemc_if" src="${document.URL}" style="width: 100%;height: 100%;border: none;display:none;"></iframe>

    <iframe style="display:none;" name="inject_namemc_if" srcdoc="<script>
      var namemc_if_iframe = window.parent.document.querySelector('#namemc_if');

      namemc_if_iframe.onload = async function() {
        if (window.parent.document.querySelector('script[type=\\'text/javascript\\']')) window.parent.document.querySelector('script[type=\\'text/javascript\\']').remove();
        var namemc_if_html = namemc_if_iframe.contentDocument.documentElement;
        window.parent.document.querySelector('title').innerText = namemc_if_html.querySelector('title').innerText;

        namemc_if_html.querySelectorAll('a').forEach(aTag => {
          if (!aTag.onclick) {
            aTag.onclick = function() {
              var target = this.target ? this.target : '_self';
              window.parent.open(this.href, target);
            }
          } else if (aTag.onclick.toString().includes('lang')) {
            var langChange = aTag.getAttribute('onclick');
            aTag.onclick = function(event) {
              event.preventDefault();
              eval('window.parent.namemc_if.contentWindow.' + langChange);
              window.parent.location.href = this.href;
            }
          }
        });

        var styleEl = document.createElement('style');
        styleEl.innerHTML = \`
          .ad-container {
            display: none!important;
          }
        \`; // hide ads

        namemc_if_html.lastElementChild.after(styleEl);

        namemc_if_html.querySelectorAll('div').forEach(div => {
          if (div.id.startsWith('nn') === true) div.remove();
        }); // remove more ads

  namemc_if_html.querySelectorAll('svg').forEach(svg => {
    svg.outerHTML = \`<svg viewBox='0 0 500 500' width='30' height='30'>
  <rect x='1.698' width='498.302' height='499.151' shape-rendering='crispEdges' style='stroke: rgb(0, 0, 0);'></rect>
  <rect x='137.787' y='108.12' width='39.511' height='326.366' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='178.16' y='68.295' width='144.446' height='39.875' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='239.889' y='191.201' width='43.896' height='51.441' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='401.879' y='191.11' width='43.896' height='51.441' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='283.1' y='148.708' width='119.343' height='42.524' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='284.35' y='241.989' width='119.343' height='42.524' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='176.8' y='393.148' width='49.643' height='40.652' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='275.46' y='392.758' width='48.089' height='40.652' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='227.854' y='348.88' width='47.313' height='44.538' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='322.988' y='278.38' width='39.511' height='154.868' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='322.626' y='107.723' width='39.511' height='41.259' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='55.947' y='216.274' width='39.511' height='97.163' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='97.002' y='174.674' width='44.766' height='41.991' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
  <rect x='96.276' y='313.224' width='45.615' height='41.991' shape-rendering='crispEdges' style='stroke: rgba(0, 0, 0, 0); fill: rgb(255, 255, 255);'></rect>
</svg>\`;
  }); // replace namemc logo to among us for funni

        var isLoggedIn = namemc_if_html.querySelector('i.fa-sign-in') ? false : true;
        if (isLoggedIn === true) {
          // if user is logged in
          /*
          namemc_if_html.querySelector('.text-nowrap.pl-0 span').innerText = 'F';
          namemc_if_html.querySelector('.text-nowrap.pl-0 img.skin-2d').src = 'https://s.namemc.com/2d/skin/face.png?id=990f115d096790d6&scale=4';
          */
        }

        var isHomePage = window.parent.location.pathname == '/';
        if (isHomePage === true) {
          var faqHTML = namemc_if_html.querySelector('#faq dl');
          var extraFAQRange = document.createRange();
          var extraFAQHTML = extraFAQRange.createContextualFragment('<dt>How does <a href=\\'#\\'>NameMC Extras</a> get its data?</dt><dd>We get our data from the <a href=\\'https://api.gapple.pw/\\' target=\\'_blank\\'>Gapple API</a> and the <a href=\\'https://github.com/Electroid/mojang-api\\'>AshCon API</a>.</dd>');
          faqHTML.insertBefore(extraFAQHTML, namemc_if_html.querySelector('#faq dl dt'));
        }

        var isProfilePage = window.parent.location.href.startsWith('https://namemc.com/profile/');
        /* adds account types */
        if (isProfilePage === true) {
          var dashlessUUIDDiv = namemc_if_html.querySelectorAll('div.row.no-gutters.align-items-center')[1];
          var uuid = dashlessUUIDDiv.lastElementChild.innerText;
          var ashConAPI = await fetch('https://api.ashcon.app/mojang/v2/user/' + uuid)
          var ashConJSON = await ashConAPI.json();
          var accountTypeAPI = await fetch('https://api.gapple.pw/status/' + uuid)
          var accountTypeJSON = await accountTypeAPI.json();

          if (accountTypeAPI.status === 200) {
            if (ashConJSON.created_at !== null) {
              var created_at = ashConJSON.created_at;
              var creationRange = document.createRange();
              var createdAtHTML = creationRange.createContextualFragment('<div class=\\'row no-gutters\\'><div class=\\'col col-lg-4\\'><strong>Created At</strong></div><div class=\\'col-auto\\' id=\\'cd_text\\'>' + new Date(created_at).toLocaleDateString() + '</div></div>');
              dashlessUUIDDiv.after(createdAtHTML);
              window.parent.namemc_if.contentWindow.$('#cd_text').tooltip({'placement':'top','boundary':'viewport','title':'<b>Creation dates are inaccurate for a lot of accounts due to a breaking change on Mojang\\'s end. We are currently fetching dates from Ashcon\\'s API. Please yell at Mojang (WEB-3367) in order for accurate creation dates to return.</b>','html':true});
            }
          }

          if (accountTypeAPI.status === 200) {
            window.parent.loader_if.style.display = 'none';
            window.parent.namemc_if.style.display = '';
            var acctype = accountTypeJSON.status;
            var accountType;
            var tooltip;

            switch (acctype) {
              case 'msa':
                accountType = 'Microsoft';
                tooltip = 'Microsoft Account';
                break;
              case 'migrated_msa':
                accountType = 'Microsoft';
                tooltip = 'Migrated from Mojang';
                break;
              case 'new_msa':
                accountType = 'Microsoft';
                tooltip = 'Newly Created';
                break;
              case 'mojang':
                accountType = 'Mojang';
                tooltip = 'Mojang Account';
                break;
              case 'normal':
                accountType = 'Normal (Mojang OR Microsoft)';
                tooltip = 'Mojang or Microsoft Account';
                break;
              case 'legacy':
                accountType = 'Legacy';
                tooltip = 'Unmigrated (2009 - Late 2012)';
                break;
            }

            var typeRange = document.createRange();
            var accountTypeHTML = typeRange.createContextualFragment('<div class=\\'row no-gutters\\'><div class=\\'col col-lg-4\\'><strong>Account Type</strong></div><div class=\\'col-auto\\' data-account-type=\\'' + tooltip + '\\'>' + accountType + '</div></div>');
            dashlessUUIDDiv.after(accountTypeHTML);
            window.parent.namemc_if.contentWindow.$('[data-account-type]').tooltip({'placement':'top','boundary':'viewport','title':tooltip});
          } else {
            window.parent.loader_if.style.display = 'none';
            window.parent.namemc_if.style.display = '';
          }
        } else {
          window.parent.loader_if.style.display = 'none';
          window.parent.namemc_if.style.display = '';
        }

        window.parent.stop();
      };
    </script>"></iframe>
  `);
        document.body.appendChild(mainHTML);
    })();
})();
