const { getSupabase } = require('../config/db');

class Payment {
  static get table() { return 'payments'; }

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
      if (value && typeof value === 'object') {
        if (value.$lte) db = db.lte(key, value.$lte);
        if (value.$gte) db = db.gte(key, value.$gte);
      } else {
        db = db.eq(key, value);
      }
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

  // Simulates Mongoose findOneAndUpdate with $ne condition for atomic-safe idempotent updates
  static async findOneAndUpdate(query, update, options = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      if (value && typeof value === 'object' && '$ne' in value) {
        db = db.neq(key, value.$ne);
      } else {
        db = db.eq(key, value);
      }
    }
    const { data: found } = await db.maybeSingle();
    if (!found) return null;
    const setData = update.$set || {};
    const { data, error } = await supabase.from(this.table).update(setData).eq('id', found.id).select().single();
    if (error) throw error;
    return data;
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

module.exports = Payment;