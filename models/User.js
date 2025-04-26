import mongoose from "mongoose";
import validator from "validator";

const addressSchema = new mongoose.Schema({
    street: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true,
    },
    postalCode: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false,
    }
});


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
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        avatar: {
            type: String,
            default: "default-avatar.jpg"
        },
        billingAddress: addressSchema,
        shippingAddress: addressSchema,
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
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