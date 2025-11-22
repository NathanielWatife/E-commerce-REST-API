const express = require('express');
const bcryptjs = require('bcryptjs');
const { User } = require('../models/User.js');
const logger = require('../utils/logger.js');

const router = express.Router();

// One-time setup endpoint to create super admin
// Should be disabled after initial setup for security
router.post('/init-super-admin', async (req, res) => {
  try {
    // Security: only allow if SUPER_ADMIN_EMAIL and PASSWORD are set
    const EMAIL = process.env.SUPER_ADMIN_EMAIL;
    const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
    const NAME = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const RESET = process.env.SUPER_ADMIN_RESET === 'true';

    if (!EMAIL || !PASSWORD) {
      return res.status(400).json({
        success: false,
        message: 'Super admin credentials not configured in environment variables'
      });
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
      
      logger.info(`Super admin created: ${EMAIL}`);
      
      return res.status(201).json({
        success: true,
        message: `Super admin created successfully: ${EMAIL}`,
        user: {
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } else {
      // Update existing user
      let changed = false;
      let changes = [];

      if (existing.role !== 'super-admin') {
        existing.role = 'super-admin';
        changed = true;
        changes.push('role updated to super-admin');
      }

      if (RESET) {
        existing.password = await bcryptjs.hash(PASSWORD, 12);
        changed = true;
        changes.push('password reset');
      }

      if (!existing.isVerified) {
        existing.isVerified = true;
        changed = true;
        changes.push('email verified');
      }

      if (!existing.isActive) {
        existing.isActive = true;
        changed = true;
        changes.push('account activated');
      }

      if (existing.accountStatus !== 'active') {
        existing.accountStatus = 'active';
        changed = true;
        changes.push('account status set to active');
      }

      if (changed) {
        await existing.save();
        logger.info(`Super admin updated: ${EMAIL}`, { changes });
        
        return res.status(200).json({
          success: true,
          message: `Super admin updated: ${changes.join(', ')}`,
          user: {
            email: existing.email,
            name: existing.name,
            role: existing.role
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Super admin already exists and is properly configured',
        user: {
          email: existing.email,
          name: existing.name,
          role: existing.role
        }
      });
    }
  } catch (error) {
    logger.error('Super admin initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize super admin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
