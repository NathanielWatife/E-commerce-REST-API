const logger = require("../utils/logger.js");

const getNotes = async (req, res) => {
    try {
        const notes = [
            { id: 'top', name: 'Top Notes' },
            { id: 'heart', name: 'Heart Notes' },
            { id: 'base', name: 'Base Notes' },
            { id: 'citrus', name: 'Citrus' },
            { id: 'floral', name: 'Floral' },
            { id: 'woody', name: 'Woody' },
            { id: 'spice', name: 'Spice' }
        ];
        return res.status(200).json({ success: true, notes });
    } catch (error) {
        logger.error('Get notes error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV ? error.message : undefined });
    }
};

module.exports = { getNotes };
