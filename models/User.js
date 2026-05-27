const { getSupabase } = require('../config/db');

class User {
  static get table() { return 'users'; }
  
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

module.exports = User;