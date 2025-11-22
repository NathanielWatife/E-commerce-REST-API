const bcryptjs = require('bcryptjs');
const { User } = require('../models/User.js');
const logger = require('../utils/logger.js');

const initSuperAdmin = async () => {
  try {
    const EMAIL = process.env.SUPER_ADMIN_EMAIL;
    const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
    const NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const RESET = process.env.SUPER_ADMIN_RESET === 'true';

    if (!EMAIL || !PASSWORD) {
      logger.warn('Super admin credentials not configured. Skipping initialization.');
      return;
    }

    const existing = await User.findOne({ email: EMAIL }).select('+password');
    
    if (!existing) {
      // Create new super admin
      const hash = await bcryptjs.hash(PASSWORD, 12);
      const user = new User({
        name: NAME,
        email: EMAIL.toLowerCase(),
        password: hash,
        role: 'super-admin',
        isVerified: true,
        isActive: true,
        accountStatus: 'active',
      });
      await user.save();
      
      logger.info(`✓ Super admin created successfully: ${EMAIL}`);
    } else {
      // Update existing user if needed
      let changed = false;
      const changes = [];

      if (existing.role !== 'super-admin') {
        existing.role = 'super-admin';
        changed = true;
        changes.push('role → super-admin');
      }

      if (RESET) {
        existing.password = await bcryptjs.hash(PASSWORD, 12);
        changed = true;
        changes.push('password reset');
      }

      if (!existing.isVerified) {
        existing.isVerified = true;
        changed = true;
        changes.push('verified');
      }

      if (!existing.isActive) {
        existing.isActive = true;
        changed = true;
        changes.push('activated');
      }

      if (existing.accountStatus !== 'active') {
        existing.accountStatus = 'active';
        changed = true;
        changes.push('status → active');
      }

      if (changed) {
        await existing.save();
        logger.info(`✓ Super admin updated: ${changes.join(', ')} [${EMAIL}]`);
      } else {
        logger.info(`✓ Super admin already configured: ${EMAIL}`);
      }
    }
  } catch (error) {
    logger.error('Failed to initialize super admin:', error);
    // Don't throw - allow app to continue even if super admin init fails
  }
};

module.exports = { initSuperAdmin };
