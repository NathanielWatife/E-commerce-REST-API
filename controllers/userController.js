const User = require("../models/User.js")
const bcryptjs = require("bcryptjs")
const { validationResult } = require("express-validator")
const logger = require("../utils/logger.js")

// Helper: extract user id from req.user (supports both id and _id)
const uid = (req) => req.user?.id || req.user?._id;

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
        billingAddress: user.billingAddress,
        shippingAddress: user.shippingAddress,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    logger.error("Get user profile error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { name, email, phoneNumber, password } = req.body
    const updates = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (phoneNumber) updates.phoneNumber = phoneNumber
    if (password) updates.password = await bcryptjs.hash(password, 12)

    const updatedUser = await User.findByIdAndUpdate(user.id, updates, { new: true })

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    logger.error("Update user profile error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Update user avatar
// @route   PUT /api/users/profile/avatar
// @access  Private
const updateUserAvatar = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { avatar } = req.body
    const updatedUser = await User.findByIdAndUpdate(user.id, { avatar }, { new: true })

    return res.status(200).json({ success: true, avatar: updatedUser.avatar })
  } catch (error) {
    logger.error("Update user avatar error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Add billing address
// @route   POST /api/users/profile/billing-address
// @access  Private
const addBillingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { street, city, state, postalCode, country, isDefault } = req.body
    const newAddress = { id: Date.now().toString(), street, city, state, postalCode, country, isDefault: isDefault || false }

    let billingAddress = Array.isArray(user.billingAddress) ? [...user.billingAddress] : []
    if (isDefault) billingAddress = billingAddress.map(a => ({ ...a, isDefault: false }))
    billingAddress.push(newAddress)
    if (billingAddress.length === 1) billingAddress[0].isDefault = true

    const updatedUser = await User.findByIdAndUpdate(user.id, { billingAddress }, { new: true })

    return res.status(201).json({ success: true, billingAddress: updatedUser.billingAddress })
  } catch (error) {
    logger.error("Add billing address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Update billing address
// @route   PUT /api/users/profile/billing-address/:addressId
// @access  Private
const updateBillingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { addressId } = req.params
    const { street, city, state, postalCode, country, isDefault } = req.body

    let billingAddress = Array.isArray(user.billingAddress) ? [...user.billingAddress] : []
    const idx = billingAddress.findIndex(a => String(a.id) === addressId)
    if (idx === -1) return res.status(404).json({ success: false, message: "Address not found" })

    if (street) billingAddress[idx].street = street
    if (city) billingAddress[idx].city = city
    if (state) billingAddress[idx].state = state
    if (postalCode) billingAddress[idx].postalCode = postalCode
    if (country) billingAddress[idx].country = country
    if (isDefault) billingAddress = billingAddress.map((a, i) => ({ ...a, isDefault: i === idx }))

    const updatedUser = await User.findByIdAndUpdate(user.id, { billingAddress }, { new: true })

    return res.status(200).json({ success: true, billingAddress: updatedUser.billingAddress })
  } catch (error) {
    logger.error("Update billing address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Delete billing address
// @route   DELETE /api/users/profile/billing-address/:addressId
// @access  Private
const deleteBillingAddress = async (req, res) => {
  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { addressId } = req.params
    let billingAddress = Array.isArray(user.billingAddress) ? [...user.billingAddress] : []
    const idx = billingAddress.findIndex(a => String(a.id) === addressId)
    if (idx === -1) return res.status(404).json({ success: false, message: "Address not found" })

    const wasDefault = billingAddress[idx].isDefault
    billingAddress.splice(idx, 1)
    if (wasDefault && billingAddress.length > 0) billingAddress[0].isDefault = true

    const updatedUser = await User.findByIdAndUpdate(user.id, { billingAddress }, { new: true })

    return res.status(200).json({ success: true, billingAddress: updatedUser.billingAddress })
  } catch (error) {
    logger.error("Delete billing address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Add shipping address
// @route   POST /api/users/profile/shipping-address
// @access  Private
const addShippingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { street, city, state, postalCode, country, isDefault } = req.body
    const newAddress = { id: Date.now().toString(), street, city, state, postalCode, country, isDefault: isDefault || false }

    let shippingAddress = Array.isArray(user.shippingAddress) ? [...user.shippingAddress] : []
    if (isDefault) shippingAddress = shippingAddress.map(a => ({ ...a, isDefault: false }))
    shippingAddress.push(newAddress)
    if (shippingAddress.length === 1) shippingAddress[0].isDefault = true

    const updatedUser = await User.findByIdAndUpdate(user.id, { shippingAddress }, { new: true })

    return res.status(201).json({ success: true, shippingAddress: updatedUser.shippingAddress })
  } catch (error) {
    logger.error("Add shipping address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Update shipping address
// @route   PUT /api/users/profile/shipping-address/:addressId
// @access  Private
const updateShippingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { addressId } = req.params
    const { street, city, state, postalCode, country, isDefault } = req.body

    let shippingAddress = Array.isArray(user.shippingAddress) ? [...user.shippingAddress] : []
    const idx = shippingAddress.findIndex(a => String(a.id) === addressId)
    if (idx === -1) return res.status(404).json({ success: false, message: "Address not found" })

    if (street) shippingAddress[idx].street = street
    if (city) shippingAddress[idx].city = city
    if (state) shippingAddress[idx].state = state
    if (postalCode) shippingAddress[idx].postalCode = postalCode
    if (country) shippingAddress[idx].country = country
    if (isDefault) shippingAddress = shippingAddress.map((a, i) => ({ ...a, isDefault: i === idx }))

    const updatedUser = await User.findByIdAndUpdate(user.id, { shippingAddress }, { new: true })

    return res.status(200).json({ success: true, shippingAddress: updatedUser.shippingAddress })
  } catch (error) {
    logger.error("Update shipping address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Delete shipping address
// @route   DELETE /api/users/profile/shipping-address/:addressId
// @access  Private
const deleteShippingAddress = async (req, res) => {
  try {
    const user = await User.findById(uid(req))
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { addressId } = req.params
    let shippingAddress = Array.isArray(user.shippingAddress) ? [...user.shippingAddress] : []
    const idx = shippingAddress.findIndex(a => String(a.id) === addressId)
    if (idx === -1) return res.status(404).json({ success: false, message: "Address not found" })

    const wasDefault = shippingAddress[idx].isDefault
    shippingAddress.splice(idx, 1)
    if (wasDefault && shippingAddress.length > 0) shippingAddress[0].isDefault = true

    const updatedUser = await User.findByIdAndUpdate(user.id, { shippingAddress }, { new: true })

    return res.status(200).json({ success: true, shippingAddress: updatedUser.shippingAddress })
  } catch (error) {
    logger.error("Delete shipping address error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10
    const page = Number(req.query.page) || 1
    const offset = pageSize * (page - 1)

    const count = await User.countDocuments({})
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(pageSize)
      .lean()

    // Strip passwords
    const safeUsers = (users || []).map(({ password, ...u }) => u)

    return res.status(200).json({ success: true, users: safeUsers, page, pages: Math.ceil(count / pageSize), count })
  } catch (error) {
    logger.error("Get all users error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Get user by ID (admin)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean()
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { password, ...safeUser } = user
    return res.status(200).json({ success: true, user: safeUser })
  } catch (error) {
    logger.error("Get user by ID error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Update user (admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })

  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    const { name, email, role, isVerified } = req.body
    const updates = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (role) updates.role = role
    if (isVerified !== undefined) updates.isVerified = isVerified

    const updatedUser = await User.findByIdAndUpdate(user.id, updates, { new: true })

    return res.status(200).json({
      success: true,
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, isVerified: updatedUser.isVerified },
    })
  } catch (error) {
    logger.error("Update user error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

// @desc    Delete user (admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: "User not found" })

    if (user.id === uid(req)) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" })
    }

    await User.findByIdAndDelete(user.id)

    return res.status(200).json({ success: true, message: "User removed" })
  } catch (error) {
    logger.error("Delete user error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  addBillingAddress,
  updateBillingAddress,
  deleteBillingAddress,
  addShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
}
