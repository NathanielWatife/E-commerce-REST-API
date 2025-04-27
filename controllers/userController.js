import { User } from "../models/User.js";
import bcryptjs from "bcryptjs";
import { validationResult } from "express-validator";


// get user profile
export const getUserProfile = async (req, res) => {
    try {
        const user = awaits User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                succes: false,
                message: "USer not found"
            });
        }
        return res.status(201).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber,
                billingAddresses: user.billingAddresses,
                shippingAddresses: user.shippingAddresses,
                role: user.role,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
            }
        })
    } catch (error) {
        console.error("Could not get user profile:", error)
        return res.status(500).json({
            succes: false,
            message: "Server error",
            error: process.env.NODE_ENV === "developemt" ? error.message : undefined 
        })
    }
};


// update user profile
export const updateUserProfile = async (req, res) => {};


// update user profile avatar
export const updateUserAvatar = async (req, res) => {};


// add billing address
export const addBillingAddress = async (req, res) => {};

// update billing address
export const updateBillingAddress = async (req, res) = {};

// delete billing address
export const deleteBillingAddress = async (req, res) => {};

// add shipping address
export const addShippingAddress = async (req, res) => {};

// update shipping address
export const updateShippingAddress = async (req, res) => {};

// delete shipping address
export const deleteShippingAddress = async (req, res) => {};