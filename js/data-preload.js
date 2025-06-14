(async () => {
  const endPoints = {
    "badges": "badges",
    "capes": "capes",
    "nmc_capes": "capes_nmc",
    "categories": "cape_categories",
    "tester_categories": "tester_categories",
    "tester_capes": "tester_capes",
    "user_badges": "user_badges",
    "user_capes": "user_capes",
    "user_emoji_overrides": "user_emoji_overrides",
    "announcements": "announcements",
    "emojis_disabled": "emojis_disabled",
    "emojis_free": "emojis_free"
  };

  try {
    const supabase_data = JSON.parse(localStorage.getItem('supabase_data'));
    if (Object.keys(supabase_data).length === Object.keys(endPoints).length + 1 && new Date(Number(localStorage.getItem("supabase_expires"))).valueOf() > new Date().valueOf()) return;
  } catch { }

  async function fetchSupabase(endPoints) {
    return Promise.all([...endPoints.map(async endPoint => await fetch(`https://data.faav.top/${endPoint}.json`)),
    await fetch('https://bedrock.lol/api/v1/capes')
    ]);
  };

  function initBooleanKey(key) {
    if (!localStorage.getItem(key) || localStorage.getItem(key) === "false") localStorage.setItem(key, "false");
  }

  async function storeResults(results) {
    var datas = Promise.all(results.map(async (result, i) => {
      let keyName = Object.keys(endPoints)[i];
      if (!keyName) keyName = "bedrock_capes";
      return [keyName, await result.json()];
    }));

    localStorage.setItem("supabase_data", JSON.stringify(Object.fromEntries(await datas)));
    localStorage.setItem("supabase_expires", new Date().valueOf() + (300 * 1000))
  }

  fetchSupabase(Object.values(endPoints)).then(results => storeResults(results));

  initBooleanKey("skinArt");
  initBooleanKey("customTheme");
})()
