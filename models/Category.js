const { getSupabase } = require('../config/db');

class Category {
  static get table() { return 'categories'; }
}

module.exports = Category;