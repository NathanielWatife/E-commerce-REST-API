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
        firstName: {
            type: String, 
            required: true, 
        },
        lastName: {
            type: String,
            required: true,
        },
        email : {
            type: String, 
            required: true, 
            unique: true,
            validate: [validator.isEmail, "Provide your email"],
            lowercase: true,
            trim: true
        },
        password: {
            type: String, 
            required: true,
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },
        avatar: {
            type: String,
            default: "default-avatar.jpg"
        },
        billingAddress: [addressSchema],
        shippingAddress: [addressSchema],
        role: {
            type: String,
            enum: ["user", "admin", "super-admin"],
            default: "user"
        },
        lastlogin: { type: Date, default: Date.now },
        loginHistory: [{
            ip: String,
            device: String,
            time: Date
        }],
        isVerified: { type: Boolean, default:false },
        isActive: {
            type: String,
            enum: ["active", "suspend", "deactivated"],
            default: "active"
        },
        resetPasswordToken: String,
        resetPasswordExpiredAt: Date,
        verificationToken: String,
        verificationTokenExpiredAt: Date,
        lastpasswordChangedAt: {
            type: Date,
            default: Date.now
        }
    }, {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);
//  virtuals for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// index for better query performance
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: 1 });

export const User = mongoose.model("User", userSchema);