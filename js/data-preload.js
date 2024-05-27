(async () => {
  var apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc29sZ3BraGp5enBycmVqcXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0NTMxMTcsImV4cCI6MjAyMTAyOTExN30.kQO7yzcNRTHUIjC-xIQPVNK2HPSqWl_kh1PrZHvdifI';

  async function fetchSupabase(endPoints) {
    return Promise.all(endPoints.map(async endPoint => await fetch(`https://cesolgpkhjyzprrejqzn.supabase.co/rest/v1${endPoint}`, {
      headers: {
        apiKey
      }
    })));
  };

  function initBooleanKey(key) {
    if (!localStorage.getItem(key) || localStorage.getItem(key) !== "true") localStorage.setItem(key, "false");
  }

  var endPoints = {
    "badges": "/badges?select=*",
    "capes": "/capes?select=*",
    "nmc_capes": "/capes_nmc?select=*",
    "categories": "/cape_categories?select=*",
    "tester_categories": "/tester_categories?select=*",
    "tester_capes": "/tester_capes?select=*",
    "user_badges": "/user_badges?select=*",
    "user_capes": "/user_capes?select=*",
    "user_emoji_overrides": "/user_emoji_overrides?select=*",
  };
  
  async function storeResults(results) {
    var inject = document.createElement('iframe');
    var datas = Promise.all(results.map(async (result, i) => {
      return [Object.keys(endPoints)[i], await result.json()];
    }));

    localStorage.setItem("supabase_data", JSON.stringify(Object.fromEntries(await datas)));
  }

  fetchSupabase(Object.values(endPoints)).then(results => storeResults(results));

  initBooleanKey("skinArt");
})()
