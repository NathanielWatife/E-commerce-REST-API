#!/usr/bin/env node
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcryptjs from 'bcryptjs'
import { connectDB } from '../config/db.js'
import { User } from '../models/User.js'

dotenv.config()

const EMAIL = process.env.SUPER_ADMIN_EMAIL
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD
const NAME = process.env.SUPER_ADMIN_NAME
const RESET = process.env.SUPER_ADMIN_RESET

if (!EMAIL || !PASSWORD) {
  console.error('Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in environment')
  process.exit(1)
}

const run = async () => {
  await connectDB()
  const existing = await User.findOne({ email: EMAIL }).select('+password')
  if (!existing) {
    const hash = await bcryptjs.hash(PASSWORD, 12)
    const user = new User({
      name: NAME,
      email: EMAIL.toLowerCase(),
      password: hash,
      role: 'super-admin',
      isVerified: true,
      isActive: true,
      accountStatus: 'active',
    })
    await user.save()
    console.log(`Created super-admin ${EMAIL}`)
  } else {
    let changed = false
    if (existing.role !== 'super-admin') {
      existing.role = 'super-admin'
      changed = true
    }
    if (RESET) {
      existing.password = await bcryptjs.hash(PASSWORD, 12)
      changed = true
    }
    existing.isVerified = true
    existing.isActive = true
    existing.accountStatus = 'active'
    changed = true
    if (changed) {
      await existing.save()
      console.log(`Updated user ${EMAIL} to super-admin${RESET ? ' and reset password' : ''}`)
    } else {
      console.log(`Super-admin ${EMAIL} already configured`)
    }
  }
  await mongoose.connection.close()
}

run().catch(async (err) => {
  console.error('Super-admin init failed:', err)
  try { await mongoose.connection.close() } catch {}
  process.exit(1)
})
