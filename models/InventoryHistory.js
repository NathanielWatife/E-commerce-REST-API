const { getSupabase } = require('../config/db');

class InventoryHistory {
  static get table() { return 'inventory_histories'; }

  static async findById(id) {
    const supabase = getSupabase();
    return supabase.from(this.table).select('*').eq('id', id).single();
  }

  static async find(query = {}, options = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      db = db.eq(key, value);
    }
    db = db.order('created_at', { ascending: false });
    if (options.limit) db = db.limit(options.limit);
    if (options.offset) db = db.range(options.offset, options.offset + (options.limit || 100) - 1);
    const result = await db;
    if (result.error) return result;
    return { data: result.data, error: null };
  }

  static async countDocuments(query = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(query)) {
      db = db.eq(key, value);
    }
    const { count, error } = await db;
    if (error) throw error;
    return count || 0;
  }

  static async create(data) {
    const supabase = getSupabase();
    return supabase.from(this.table).insert([data]).select().single();
  }
}

module.exports = InventoryHistory;