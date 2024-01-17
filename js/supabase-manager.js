let client = null;

function getSupabaseClient() {
  if (client) return client;
  client = window.supabase.createClient('https://cesolgpkhjyzprrejqzn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc29sZ3BraGp5enBycmVqcXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0NTMxMTcsImV4cCI6MjAyMTAyOTExN30.kQO7yzcNRTHUIjC-xIQPVNK2HPSqWl_kh1PrZHvdifI');
  return client;
}



class SupabaseCape {
  constructor(name, description, src, image) {
    this.name = name;
    this.description = description;
    this.src = src;
    this.image = image;
  }
}



/**
 * 
 * @param {string} uuid 
 * @returns {Promise<SupabaseCape[]>}
 */
async function getUserCapes(uuid) {
  const { data, error } = await getSupabaseClient()
    .from('user_capes')
    .select('cape(*)')
    .eq('user', uuid);
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data.map(v => new SupabaseCape(v.cape.name, v.cape.description, v.cape.image_src, v.cape.image_preview));
}