const { getSupabase } = require('../config/db');

class Payment {
  static get table() { return 'payments'; }

  static async findById(id) {
    const supabase = getSupabase();
    return supabase.from(this.table).select('*').eq('id', id).single();
  }

  static async find(query, options = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'object' && value !== null) {
        if (value.$lte) db = db.lte(key, value.$lte);
        if (value.$gte) db = db.gte(key, value.$gte);
      } else {
        db = db.eq(key, value);
      }
    }
    if (options.limit) {
      db = db.limit(options.limit);
    }
    return db; // Returns { data, error } array wrapper
  }

  static async create(data) {
    const supabase = getSupabase();
    return supabase.from(this.table).insert([data]).select().single();
  }

  static async update(id, data) {
    const supabase = getSupabase();
    return supabase.from(this.table).update(data).eq('id', id).select().single();
  }
}

module.exports = Payment;