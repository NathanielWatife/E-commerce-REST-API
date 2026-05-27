const { getSupabase } = require('../config/db');

class Cart {
  static get table() { return 'carts'; }
}

module.exports = Cart;