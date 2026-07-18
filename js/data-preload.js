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

  function initBooleanKey(key) {
    if (!superStorage.getItem(key)) superStorage.setItem(key, "false");
  }

  initBooleanKey("skinArt");
  initBooleanKey("customTheme");

  function hasFreshData() {
    try {
      const data = JSON.parse(superStorage.getItem("supabase_data"));
      return data &&
        Object.keys(data).length === Object.keys(endPoints).length + 1 &&
        Number(superStorage.getItem("supabase_expires")) > Date.now();
    } catch {
      return false;
    }
  }

  if (hasFreshData()) return;

  async function fetchSupabase(endPoints) {
    const keys = [...endPoints, "bedrock_capes"];
    const urls = [
      ...Object.values(endPoints).map(ep => `https://data.faav.top/${ep}.json`),
      "https://bedrockviewer.com/api/v1/capes"
    ];

    // Fetch everything individually so one failure won't block others
    const results = await Promise.all(
      urls.map(async (url, i) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (err) {
          console.warn(`Failed to fetch ${keys[i]} from ${url}:`, err);
          return null; // null signals failure
        }
      })
    );

    return results;
  }

  async function storeResults(results) {
    if (!results) return;

    const keys = [...Object.keys(endPoints), "bedrock_capes"];
    const oldData = JSON.parse(superStorage.getItem("supabase_data") || "{}");

    keys.forEach((key, i) => {
      if (results[i] !== null) {
        oldData[key] = results[i]; // update only successful fetch
      } else {
        console.warn(`Keeping old data for ${key}`);
      }
    });

    superStorage.setItem("supabase_data", JSON.stringify(oldData));
    superStorage.setItem("supabase_expires", Date.now() + 300_000);
    console.log("Supabase data updated (partial updates allowed).");
  }

  const refresh = async () => {
    if (hasFreshData()) return;
    await storeResults(await fetchSupabase(Object.values(endPoints)));
  };

  if (navigator.locks?.request) {
    await navigator.locks.request("namemc-extras-data-refresh", refresh);
  } else {
    await refresh();
  }
})();
