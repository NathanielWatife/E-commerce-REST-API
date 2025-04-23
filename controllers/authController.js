import { User } from "../models/User.js";
import bcryptjs from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";

export const signup = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
                console.error("All fields are required"); 
        }
        const userAlreadyExists = await User.findOne({email});
        if (userAlreadyExists) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        // hash the password
        const hashPassword = await bcryptjs.hash(password, 32);
        const verificationToken = Math.floor(1000 + Math.random() * 900000).toString
        // create user
        const user = new User({
            name,
            email,
            password: hashPassword,
            verificationToken,
            verificationTokenExpiredAt: Date.now() + 24 * 60 * 60 *1000 
        });
        await user.save();

        // jwt
        generateTokenAndSetCookie(res, user._id);
        res.status(201).json({
            success: true,
            message: "User created",
            user: {
                ...user._doc,
                password: undefined,
            }
        });
    } catch (error) {
        return res(500).json({
            success: false, message: error.message
        });
    }
};


export const login = async (res, req) => {
    res.send("login route");
};


export const logout = async (res, req) => {
    res.send("Logout route");
};