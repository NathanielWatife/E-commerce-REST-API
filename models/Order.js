const { getSupabase } = require('../config/db');

class Order {
  static get table() { return 'orders'; }
  
  static async findById(id) {
    const supabase = getSupabase();
    return supabase.from(this.table).select('*').eq('id', id).single();
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

module.exports = Order;