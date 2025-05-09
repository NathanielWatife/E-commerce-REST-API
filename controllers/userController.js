import { User } from "../models/User.js"
import bcryptjs from "bcryptjs"
import { validationResult } from "express-validator"

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
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
    console.error("Get user profile error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { name, email, phoneNumber, password } = req.body

    // Update user fields if provided
    if (name) user.name = name
    if (email) user.email = email
    if (phoneNumber) user.phoneNumber = phoneNumber
    if (password) {
      user.password = await bcryptjs.hash(password, 12)
    }

    const updatedUser = await user.save()

    return res.status(200).json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    console.error("Update user profile error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update user avatar
// @route   PUT /api/users/profile/avatar
// @access  Private
export const updateUserAvatar = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { avatar } = req.body

    // Update avatar
    user.avatar = avatar

    const updatedUser = await user.save()

    return res.status(200).json({
      success: true,
      avatar: updatedUser.avatar,
    })
  } catch (error) {
    console.error("Update user avatar error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Add billing address
// @route   POST /api/users/profile/billing-address
// @access  Private
export const addBillingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { street, city, state, postalCode, country, isDefault } = req.body

    // Create new address
    const newAddress = {
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    }

    // If this address is set as default, update other addresses
    if (isDefault) {
      user.billingAddress.forEach((address) => {
        address.isDefault = false
      })
    }

    // Add new address
    user.billingAddress.push(newAddress)

    // If this is the first address, set it as default
    if (user.billingAddress.length === 1) {
      user.billingAddress[0].isDefault = true
    }

    await user.save()

    return res.status(201).json({
      success: true,
      billingAddress: user.billingAddress,
    })
  } catch (error) {
    console.error("Add billing address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update billing address
// @route   PUT /api/users/profile/billing-address/:addressId
// @access  Private
export const updateBillingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { addressId } = req.params
    const { street, city, state, postalCode, country, isDefault } = req.body

    // Find address index
    const addressIndex = user.billingAddress.findIndex((address) => address._id.toString() === addressId)

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    // Update address fields
    if (street) user.billingAddress[addressIndex].street = street
    if (city) user.billingAddress[addressIndex].city = city
    if (state) user.billingAddress[addressIndex].state = state
    if (postalCode) user.billingAddress[addressIndex].postalCode = postalCode
    if (country) user.billingAddress[addressIndex].country = country

    // Handle default address
    if (isDefault) {
      user.billingAddress.forEach((address, index) => {
        address.isDefault = index === addressIndex
      })
    }

    await user.save()

    return res.status(200).json({
      success: true,
      billingAddress: user.billingAddress,
    })
  } catch (error) {
    console.error("Update billing address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Delete billing address
// @route   DELETE /api/users/profile/billing-address/:addressId
// @access  Private
export const deleteBillingAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { addressId } = req.params

    // Find address index
    const addressIndex = user.billingAddress.findIndex((address) => address._id.toString() === addressId)

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    // Check if this is the default address
    const isDefault = user.billingAddress[addressIndex].isDefault

    // Remove address
    user.billingAddress.splice(addressIndex, 1)

    // If removed address was default and there are other addresses, set a new default
    if (isDefault && user.billingAddress.length > 0) {
      user.billingAddress[0].isDefault = true
    }

    await user.save()

    return res.status(200).json({
      success: true,
      billingAddress: user.billingAddress,
    })
  } catch (error) {
    console.error("Delete billing address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Add shipping address
// @route   POST /api/users/profile/shipping-address
// @access  Private
export const addShippingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { street, city, state, postalCode, country, isDefault } = req.body

    // Create new address
    const newAddress = {
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    }

    // If this address is set as default, update other addresses
    if (isDefault) {
      user.shippingAddress.forEach((address) => {
        address.isDefault = false
      })
    }

    // Add new address
    user.shippingAddress.push(newAddress)

    // If this is the first address, set it as default
    if (user.shippingAddress.length === 1) {
      user.shippingAddress[0].isDefault = true
    }

    await user.save()

    return res.status(201).json({
      success: true,
      shippingAddress: user.shippingAddress,
    })
  } catch (error) {
    console.error("Add shipping address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update shipping address
// @route   PUT /api/users/profile/shipping-address/:addressId
// @access  Private
export const updateShippingAddress = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { addressId } = req.params
    const { street, city, state, postalCode, country, isDefault } = req.body

    // Find address index
    const addressIndex = user.shippingAddress.findIndex((address) => address._id.toString() === addressId)

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    // Update address fields
    if (street) user.shippingAddress[addressIndex].street = street
    if (city) user.shippingAddress[addressIndex].city = city
    if (state) user.shippingAddress[addressIndex].state = state
    if (postalCode) user.shippingAddress[addressIndex].postalCode = postalCode
    if (country) user.shippingAddress[addressIndex].country = country

    // Handle default address
    if (isDefault) {
      user.shippingAddress.forEach((address, index) => {
        address.isDefault = index === addressIndex
      })
    }

    await user.save()

    return res.status(200).json({
      success: true,
      shippingAddress: user.shippingAddress,
    })
  } catch (error) {
    console.error("Update shipping address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Delete shipping address
// @route   DELETE /api/users/profile/shipping-address/:addressId
// @access  Private
export const deleteShippingAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { addressId } = req.params

    // Find address index
    const addressIndex = user.shippingAddress.findIndex((address) => address._id.toString() === addressId)

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      })
    }

    // Check if this is the default address
    const isDefault = user.shippingAddress[addressIndex].isDefault

    // Remove address
    user.shippingAddress.splice(addressIndex, 1)

    // If removed address was default and there are other addresses, set a new default
    if (isDefault && user.shippingAddress.length > 0) {
      user.shippingAddress[0].isDefault = true
    }

    await user.save()

    return res.status(200).json({
      success: true,
      shippingAddress: user.shippingAddress,
    })
  } catch (error) {
    console.error("Delete shipping address error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10
    const page = Number(req.query.page) || 1

    const count = await User.countDocuments({})
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))

    return res.status(200).json({
      success: true,
      users,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    })
  } catch (error) {
    console.error("Get all users error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}


// get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    return res.status(200).json({
      success: true,
      user,
    })
  } catch (error) {
    console.error("Get user by ID error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// update user
export const updateUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { name, email, role, isVerified } = req.body

    // Update user fields if provided
    if (name) user.name = name
    if (email) user.email = email
    if (role) user.role = role
    if (isVerified !== undefined) user.isVerified = isVerified

    const updatedUser = await user.save()

    return res.status(200).json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// delete user account
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      })
    }

    await user.deleteOne()

    return res.status(200).json({
      success: true,
      message: "User removed",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
