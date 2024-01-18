(async () => {
  var apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc29sZ3BraGp5enBycmVqcXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0NTMxMTcsImV4cCI6MjAyMTAyOTExN30.kQO7yzcNRTHUIjC-xIQPVNK2HPSqWl_kh1PrZHvdifI';

  async function fetchSupabase(endPoints) {
    return Promise.all(endPoints.map(async endPoint => await fetch(`https://cesolgpkhjyzprrejqzn.supabase.co/rest/v1${endPoint}`, {
      headers: {
        apiKey
      }
    })))
  }

  var endPoints = {
    "categories": "/cape_categories?select=*",
    "capes": "/capes?select=*",
    "users": "/user_capes?select=*"
  }


  async function injectResults(results) {
    var inject = document.createElement('iframe');
    var datas = Promise.all(results.map(async (result, i) => {
      return [Object.keys(endPoints)[i], await result.json()]
    }))

    inject.srcdoc = `<script>window.top.supabase_data=${JSON.stringify(Object.fromEntries(await datas))}</script>`;
    inject.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(inject);
  }

  fetchSupabase(Object.values(endPoints)).then(async results => {
    injectResults(results)
  })
})()