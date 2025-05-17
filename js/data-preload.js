(async () => {
  if (!localStorage['preloaded']) localStorage['preloaded'] = 0;
  if (localStorage['preloaded'] === "1") {
    localStorage['preloaded'] = 0;
    return;
  }
  localStorage['preloaded'] = 1;
  async function fetchSupabase(endPoints) {
    return Promise.all([...endPoints.map(async endPoint => await fetch(`https://raw.githubusercontent.com/NameMC-Extras/data/main/${endPoint}.json`, {
      headers: {
        'Cache-Control': 'max-age=120'
      }
    })),
    await fetch('https://bedrock.lol/api/v1/capes', {
      headers: {
        'Cache-Control': 'max-age=120'
      }
    })
    ]);
  };

  function initBooleanKey(key) {
    if (!localStorage.getItem(key) || localStorage.getItem(key) !== "true") localStorage.setItem(key, "false");
  }

  var endPoints = {
    "badges": "badges",
    "capes": "capes",
    "nmc_capes": "capes_nmc",
    "categories": "cape_categories",
    "tester_categories": "tester_categories",
    "tester_capes": "tester_capes",
    "user_badges": "user_badges",
    "user_capes": "user_capes",
    "user_emoji_overrides": "user_emoji_overrides",
  };

  async function storeResults(results) {
    var datas = Promise.all(results.map(async (result, i) => {
      let keyName = Object.keys(endPoints)[i];
      if (!keyName) keyName = "bedrock_capes";
      return [keyName, await result.json()];
    }));

    localStorage.setItem("supabase_data", JSON.stringify(Object.fromEntries(await datas)));
  }

  fetchSupabase(Object.values(endPoints)).then(results => storeResults(results));

  initBooleanKey("skinArt");
  initBooleanKey("customTheme");
})()
