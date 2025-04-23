import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {type: String, required: true, unique: true},
        email : {type: String, required: true, unique: true},
        password: {type: String, required: true},
        lastlogin: { type: Date, default: Date.now },
        isVerified: {type: Boolean, default:false},
        resetPasswordToken: String,
        resetPasswordExpiredAt: Date,
        verificationToken: String,
        verificationTokenExpiredAt: Date,
    }, {timestamps: true},
);

export const User = mongoose.model("User", userSchema);