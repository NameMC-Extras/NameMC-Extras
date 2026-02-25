(async () => {
  await superStorage._ready;

  const endPoints = {
    badges: "badges",
    capes: "capes",
    nmc_capes: "capes_nmc",
    categories: "cape_categories",
    tester_categories: "tester_categories",
    tester_capes: "tester_capes",
    user_badges: "user_badges",
    user_capes: "user_capes",
    user_emoji_overrides: "user_emoji_overrides",
    announcements: "announcements",
    emojis_disabled: "emojis_disabled",
    emojis_free: "emojis_free"
  };

  try {
    const supabase_data = JSON.parse(superStorage.getItem("supabase_data"));
    const expires = Number(superStorage.getItem("supabase_expires"));
    if (supabase_data && Object.keys(supabase_data).length === Object.keys(endPoints).length + 1 && expires > Date.now()) return;
  } catch {}

  function initBooleanKey(key) {
    if (!superStorage.getItem(key)) superStorage.setItem(key, "false");
  }

  async function fetchSupabase(endPoints) {
    // fetch all endpoints + bedrock_capes in parallel
    const promises = endPoints.map(ep => fetch(`https://data.faav.top/${ep}.json`));
    promises.push(fetch("https://bedrockviewer.com/api/v1/capes"));
    return Promise.all(promises);
  }

  async function storeResults(results) {
    const keys = [...Object.keys(endPoints), "bedrock_capes"];
    const dataEntries = await Promise.all(
      results.map((res, i) => res.json().then(json => [keys[i], json]))
    );
    superStorage.setItem("supabase_data", JSON.stringify(Object.fromEntries(dataEntries)));
    superStorage.setItem("supabase_expires", Date.now() + 300_000);
  }

  fetchSupabase(Object.values(endPoints)).then(storeResults);

  initBooleanKey("skinArt");
  initBooleanKey("customTheme");
})();