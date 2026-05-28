const { getSupabase } = require('../config/db');

class Category {
  static get table() { return 'categories'; }

  static async findById(id) {
    const supabase = getSupabase();
    return supabase.from(this.table).select('*').eq('id', id).single();
  }

  static async findOne(query) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      db = db.eq(key, value);
    }
    return db.maybeSingle();
  }

  static async find(query = {}, options = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      if (value && typeof value === 'object' && value.$regex) {
        db = db.ilike(key, `%${value.$regex}%`);
      } else {
        db = db.eq(key, value);
      }
    }
    if (options.order) db = db.order(options.order, { ascending: options.ascending ?? true });
    else db = db.order('name', { ascending: true });
    if (options.limit) db = db.limit(options.limit);
    if (options.offset) db = db.range(options.offset, options.offset + (options.limit || 1000) - 1);
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

  static async update(id, data) {
    const supabase = getSupabase();
    return supabase.from(this.table).update(data).eq('id', id).select().single();
  }

  static async delete(id) {
    const supabase = getSupabase();
    return supabase.from(this.table).delete().eq('id', id);
  }
}

module.exports = Category;