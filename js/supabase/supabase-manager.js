let client = null;

function getSupabaseClient() {
  if (client) return client;
  client = window.supabase.createClient('https://cesolgpkhjyzprrejqzn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlc29sZ3BraGp5enBycmVqcXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0NTMxMTcsImV4cCI6MjAyMTAyOTExN30.kQO7yzcNRTHUIjC-xIQPVNK2HPSqWl_kh1PrZHvdifI');
  return client;
}

class SupabaseCapeOwnership {
  constructor(uuid, note) {
    this.uuid = uuid;
    this.note = note;
  }
}

class SupabaseCape {
  constructor(id, name, description, src, image, category) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.src = src;
    this.image = image;
    this.category = category;
  }

  getURL() {
    return `https://namemc.com/cape/${this.category}/${this.id.replace("-", "")}`
  }

  /**
   * Returns an array of UUIDs for users that own this cape
   * @returns {Promise<SupabaseCapeOwnership[]>}
   */
  async getUsers() {
    const { data, error } = await getSupabaseClient()
      .from('user_capes')
      .select()
      .eq('cape', this.id);
    if (error) {
      console.warn(error.message);
      return [];
    }
    return data.map(v => new SupabaseCapeOwnership(v.user, v.note));
  }
}

class SupabaseCapeCategory {
  constructor(id, name, hidden) {
    this.id = id;
    this.name = name;
    this.hidden = hidden;
  }

  /**
   * Returns an array of capes under this category
   * @returns {Promise<SupabaseCape[]>}
   */
  async getCapes() {
    const { data, error } = await getSupabaseClient()
      .from('capes')
      .select()
      .eq('category', this.id);
    if (error) {
      console.warn(error.message);
      return [];
    }
    return data.map(v => new SupabaseCape(v.id, v.name, v.description, v.image_src, v.image_render, v.category));
  }
}

/**
 * Returns a cape category or null if non-existent
 * @param {string} id 
 * @returns {Promise<SupabaseCapeCategory | null>}
 */
async function getCapeCategory(id) {
  const { data, error } = await getSupabaseClient()
    .from('cape_categories')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn(error.message);
    return null;
  }
  return data ? new SupabaseCapeCategory(data.id, data.name) : null;
}
async function getUsers(id) {
  const { data, error } = await getSupabaseClient()
    .from('user_capes')
    .select()
    .eq('cape', id);
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data.map(v => new SupabaseCapeOwnership(v.user, v.note));
}

function getURL(category, id) {
  return `https://namemc.com/cape/${category}/${id.replace("-", "")}`
}

/**
 * Returns a cape with a matching ID or null if non-existent
 * @param {string} id 
 * @returns {Promise<SupabaseCape | null>}
 */
async function getCape(id) {
  const { data, error } = await getSupabaseClient()
    .from('capes')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data ? new SupabaseCape(data.id, data.name, data.description, data.image_src, data.image_render, data.category) : null;
}

/**
 * Returns an array of capes a user owns
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
  return data.map(v => new SupabaseCape(v.cape.id, v.cape.name, v.cape.description, v.cape.image_src, v.cape.image_render, v.cape.category));
}
