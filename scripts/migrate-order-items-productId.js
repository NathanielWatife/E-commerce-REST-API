#!/usr/bin/env node
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Order } from '../models/Order.js'

dotenv.config()

const run = async () => {
  await connectDB()
  let ordersScanned = 0
  let ordersUpdated = 0
  let itemsMigrated = 0

  const cursor = Order.find({ 'orderItems.productId': { $exists: true } }).cursor()

  for (let order = await cursor.next(); order != null; order = await cursor.next()) {
    ordersScanned++
    let changed = false

    for (const item of order.orderItems) {
      if (item.productId && !item.product) {
        item.product = item.productId
        // delete legacy field; ensure mongoose sees the change on subdoc
        item.set('productId', undefined, { strict: false })
        changed = true
        itemsMigrated++
      }
    }

    if (changed) {
      order.markModified('orderItems')
      await order.save()
      ordersUpdated++
      process.stdout.write('.')
    }
  }

  console.log('\nMigration complete')
  console.log(`Orders scanned: ${ordersScanned}`)
  console.log(`Orders updated: ${ordersUpdated}`)
  console.log(`Items migrated: ${itemsMigrated}`)

  await mongoose.connection.close()
}

run().catch(async (err) => {
  console.error('Migration failed:', err)
  try { await mongoose.connection.close() } catch {}
  process.exit(1)
})
