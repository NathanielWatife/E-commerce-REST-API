const { getSupabase } = require('../config/db');

class InventoryHistory {
  static get table() { return 'inventory_histories'; }
}

module.exports = InventoryHistory;