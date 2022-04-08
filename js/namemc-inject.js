/* copyright 2022 | Faav#6320 | github.com/bribes */
(function() {
  if (window.location.host !== 's.namemc.com' && window.location.host !== 'store.namemc.com') {
    document.write('<!-- By Faav#6320 | github.com/bribes --><html></html>'); // override html

    document.querySelector('head').innerHTML = '<title>NameMC</title>'; // add placeholder title
    document.body.style.margin = 0;

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
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@500&family=Roboto:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
</head>
<body style="height: 100%;width: 100%;display: flex;align-items: center;justify-content: center;align-content: center;">
<div class="spinner-border" role="status">
  <span class="visually-hidden">Loading...</span>
</div>
<script>
  window.parent.onhashchange = function() { 
    if (window.parent.location.hash == "#devMode") window.parent.location.reload();
  }
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
        var devMode = window.parent.location.hash.endsWith('#devMode');
        var isHomeCustom = false;
        if (window.parent.document.querySelector('script[type=\\'text/javascript\\']')) window.parent.document.querySelector('script[type=\\'text/javascript\\']').remove();
        var namemc_if_html = namemc_if_iframe.contentDocument.documentElement;

        var form = namemc_if_html.querySelector('form[action=\\'/search\\']');
        form.onsubmit = function() {
          window.parent.location.href = 'https://' + window.parent.location.host + '/search?' + namemc_if_iframe.contentWindow.$('form[action=\\'/search\\']').serialize() + window.parent.location.hash;
        }

        window.parent.document.querySelector('title').innerText = namemc_if_html.querySelector('title').innerText;

        function finishLoad() {
          namemc_if_html.querySelectorAll('a').forEach(aTag => {
            if (!aTag.onclick) {
              if (aTag.getAttribute('role') !== 'tab') {
              aTag.onclick = function() {
                var target = this.target ? this.target : '_self';
                var href = this.href;
                if (window.parent.location.hash !== '') href = href.replace('#', '');
                window.parent.open(href + window.parent.location.hash, target);
              }
              }
            } else {
              var clickFunc = aTag.getAttribute('onclick');
              aTag.onclick = function(event) {
                event.preventDefault();
                eval('window.parent.namemc_if.contentWindow.' + clickFunc);
                var href = this.href;
                if (window.parent.location.hash !== '') href = href.replace('#', '');
                if (href.startsWith('javascript:') == false) href += window.parent.location.hash;
                window.parent.open(href, '_self');
              }
            }
          });
          window.parent.loader_if.style.display = 'none';
          window.parent.namemc_if.style.display = '';
        }

        var styleEl = document.createElement('style');
        styleEl.innerHTML = \`
          .ad-container {
            display: none!important;
          }
          .nav-item {
            display: flex;
            align-items: center;
          }
        \`; // hide ads

        namemc_if_html.lastElementChild.after(styleEl);

        namemc_if_html.querySelectorAll('div').forEach(div => {
          if (div.id.startsWith('nn') === true) div.remove();
        }); // remove more ads

      if (devMode === true) {
        namemc_if_html.querySelectorAll('svg').forEach(svg => {
        svg.outerHTML = \`
          <svg viewBox='0 0 500 500' width='30' height='30'>
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
          namemc_if_html.querySelector('.text-nowrap.pl-0 span').innerText = 'Developer';
        }

        function customPage(page, name, callBack) {
          var isPage = new URLSearchParams(window.parent.location.search).get('page') == page;
          var capeDropNav = namemc_if_html.querySelector('a.dropdown-item[href=\\'/capes\\']');
          var navBar = namemc_if_html.querySelector('nav ul');
          var nameBarDropdown = namemc_if_html.querySelector('.dropdown-menu');
          var customNavRange = document.createRange();
          var customNavHTML = customNavRange.createContextualFragment(\`<li class='nav-item'><a class='nav-link' href='https://\${window.parent.location.host}/?page=\${page}'>\${name}</a></li>\`);
          var customNavDropRange = document.createRange();
          var customNavDropHTML = customNavDropRange.createContextualFragment(\`<a class='dropdown-item' id='\${page}' href='https://\${window.parent.location.host}/?page=\${page}' title='\${name}'>\${name}</a>\`);
          navBar.appendChild(customNavHTML);
          capeDropNav.after(customNavDropHTML);
          if (isPage === true) {
            isHomeCustom = true;
            namemc_if_html.querySelector('.dropdown-item.active').classList.remove('active');
            namemc_if_html.querySelector('#' + page).classList.add('active');
            callBack();
          }
        }

        customPage('test-page', 'Test Page', function() {
          namemc_if_html.querySelector('main').innerHTML = '<p>test</p>';
        });

        customPage('skin-cape-tester', 'Skin & Cape Tester', function() {
          namemc_if_html.querySelector('main').innerHTML = '<p>bro wtf1</p>';
        });
      }

        var isHome = window.parent.location.pathname == '/';
        if (isHome === true && isHomeCustom === false) {
          var faqHTML = namemc_if_html.querySelector('#faq dl');
          var extraFAQRange = document.createRange();
          var extraFAQHTML = extraFAQRange.createContextualFragment('<dt>How does <a href=\\'#\\'>NameMC Extras</a> get its data?</dt><dd>We get our data from the <a href=\\'https://api.gapple.pw/\\' target=\\'_blank\\'>Gapple API</a> and the <a href=\\'https://github.com/Electroid/mojang-api\\'>AshCon API</a>.</dd>');
          faqHTML.insertBefore(extraFAQHTML, namemc_if_html.querySelector('#faq dl dt'));
        }

        var isProfile = namemc_if_html.querySelector('title').innerText.endsWith(' | Minecraft Profile | NameMC');
        /* adds account types */
        if (isProfile === true) {
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
            finishLoad();
          } else {
            finishLoad();
          }
        } else {
          finishLoad();
        }

        window.parent.stop();
      };
    </script>"></iframe>
  `);
        document.body.appendChild(mainHTML);
    })();
  }
})();
