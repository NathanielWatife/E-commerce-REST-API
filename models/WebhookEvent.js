const { getSupabase } = require('../config/db');

class WebhookEvent {
  static get table() { return 'webhook_events'; }

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

  // Upsert by eventId; $setOnInsert maps to insert-only fields (handle via upsert)
  static async findOneAndUpdate(query, update, options = {}) {
    const supabase = getSupabase();
    // Check if row exists
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      db = db.eq(key, value);
    }
    const { data: existing } = await db.maybeSingle();

    if (existing) {
      // Row exists — apply $set fields only
      const setData = update.$set || {};
      if (Object.keys(setData).length > 0) {
        const { data, error } = await supabase.from(this.table).update(setData).eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
      }
      return existing;
    } else {
      // Row doesn't exist — insert with setOnInsert + set merged
      const insertData = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      const { data, error } = await supabase.from(this.table).insert([insertData]).select().single();
      if (error) throw error;
      return data;
    }
  }

  static async updateOne(query, update) {
    const supabase = getSupabase();
    // Find the row first
    let db = supabase.from(this.table).select('id');
    for (const [key, value] of Object.entries(query)) {
      db = db.eq(key, value);
    }
    const { data: found } = await db.maybeSingle();
    if (!found) return { data: null, error: null };
    const setData = update.$set || {};
    return supabase.from(this.table).update(setData).eq('id', found.id).select().single();
  }

  static async find(query = {}, options = {}) {
    const supabase = getSupabase();
    let db = supabase.from(this.table).select('*');
    for (const [key, value] of Object.entries(query)) {
      if (value && typeof value === 'object') {
        if (value.$regex) db = db.ilike(key, `%${value.$regex}%`);
        else if ('$in' in value) db = db.in(key, value.$in);
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
      if (value && typeof value === 'object') {
        if ('$in' in value) db = db.in(key, value.$in);
      } else {
        db = db.eq(key, value);
      }
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
}

module.exports = WebhookEvent;