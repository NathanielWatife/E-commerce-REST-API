const bcryptjs = require('bcryptjs');
const User = require('../models/User.js');
const logger = require('../utils/logger.js');

const initSuperAdmin = async () => {
  try {
    const EMAIL = process.env.SUPER_ADMIN_EMAIL;
    const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
    const NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const RESET = process.env.SUPER_ADMIN_RESET === 'true';

    if (!EMAIL || !PASSWORD) {
      logger.warn('Admin credentials not configured.');
      return;
    }

    const existing = await User.findOne({ email: EMAIL });
    
    if (!existing) {
      // Create new super admin
      const hash = await bcryptjs.hash(PASSWORD, 12);
      await User.create({
        name: NAME,
        email: EMAIL.toLowerCase(),
        password: hash,
        role: 'super-admin',
        isVerified: true,
        isActive: true,
        accountStatus: 'active',
      });
      
      logger.info("✓ Admin created successfully");
    } else {
      // Update existing user if needed
      let changed = false;
      const changes = [];
      const updateData = {};

      if (existing.role !== 'super-admin') {
        updateData.role = 'super-admin';
        changed = true;
        changes.push('role → super-admin');
      }

      if (RESET) {
        updateData.password = await bcryptjs.hash(PASSWORD, 12);
        changed = true;
        changes.push('password reset');
      }

      if (!existing.isVerified) {
        updateData.isVerified = true;
        changed = true;
        changes.push('verified');
      }

      if (!existing.isActive) {
        updateData.isActive = true;
        changed = true;
        changes.push('activated');
      }

      if (existing.accountStatus !== 'active') {
        updateData.accountStatus = 'active';
        changed = true;
        changes.push('status → active');
      }

      if (changed) {
        await User.findByIdAndUpdate(existing.id, updateData);
        logger.info(`✓ Admin updated: ${changes.join(', ')} `);
      } else {
        logger.info(`✓ Admin already configured`);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize admin:', error);
    // Don't throw - allow app to continue even if admin init fails
  }
};

module.exports = { initSuperAdmin };
