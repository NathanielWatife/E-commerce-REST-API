import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String, 
            required: true, 
            unique: true,
        },
        email : {
            type: String, 
            required: true, 
            unique: true,
            validate: [validator.isEmail, "Provide your email"]
        },
        password: {
            type: String, 
            required: true,
            minlength: [8, "Password must be at least 8 characters"]
        },
        lastlogin: { type: Date, default: Date.now },
        isVerified: {type: Boolean, default:false},
        resetPasswordToken: String,
        resetPasswordExpiredAt: Date,
        verificationToken: String,
        verificationTokenExpiredAt: Date,
    }, {timestamps: true},
);

export const User = mongoose.model("User", userSchema);