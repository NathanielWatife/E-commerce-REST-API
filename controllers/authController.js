import { User } from "../models/User.js";
import bcryptjs from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { validationResult } from "express-validator";

export const signup = async (req, res) => {
    // validatet user inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    } 

    const { name, email, password } = req.body;
    try {
        const userAlreadyExists = await User.findOne({email});
        if (userAlreadyExists) {
            return res.status(400).json({ 
                success: false, 
                message: "User already exists" 
            });
        }
        // hash the password
        const hashPassword = await bcryptjs.hash(password, 12);
        const verificationToken = Math.floor(1000 + Math.random() * 900000).toString();
        // create user
        const user = new User({
            name,
            email,
            password: hashPassword,
            verificationToken,
            verificationTokenExpiredAt: Date.now() + 24 * 60 * 60 *1000,
        });
        await user.save();

        // jwt
        generateTokenAndSetCookie(res, user._id);
        return res.status(201).json({
            success: true,
            message: "User created",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false, 
            message: "Internal Server error"
        });
    }
};


export const login = async (req, res) => {
    // validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid details"
            });
        }
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "not verified"
            });
        }

        // update lastlogin
        user.lastlogin = Date.now();
        await user.save();

        // generate token
        generateTokenAndSetCookie(res, user._id);

        return res.status(200).json({
            success: true,
            message: "Logged in",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error("Login error", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


export const logout = async (req, res) => {
    try {
        res.clearCookie('token');
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            success: false, 
            message: "Internal server error"
        });
    }
};
