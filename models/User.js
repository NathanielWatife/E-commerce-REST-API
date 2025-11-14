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
        // Display name used across the app
        name: {
            type: String,
            required: true,
            trim: true,
        },
        // Optional granular names to support future features
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            validate: [validator.isEmail, "Provide your email"],
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        avatar: {
            type: String,
            default: "default-avatar.jpg",
        },
        billingAddress: [addressSchema],
        shippingAddress: [addressSchema],
        role: {
            type: String,
            enum: ["user", "admin", "super-admin"],
            default: "user",
        },
        lastLogin: { type: Date, default: Date.now },
        loginHistory: [
            {
                ip: String,
                device: String,
                time: Date,
            },
        ],
        isVerified: { type: Boolean, default: false },
        // Separate active flag and account status for admin controls
        isActive: { type: Boolean, default: true },
        accountStatus: {
            type: String,
            enum: ["active", "suspended", "deactivated"],
            default: "active",
        },
        resetPasswordToken: String,
        resetPasswordExpiredAt: Date,
        verificationToken: String,
        verificationTokenExpiredAt: Date,
        lastpasswordChangedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);
//  virtuals for full name
userSchema.virtual("fullName").get(function () {
    if (this.firstName || this.lastName) {
        return `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }
    return this.name;
});

// Keep name/firstName/lastName in sync when possible
userSchema.pre("save", function (next) {
    if (!this.name && (this.firstName || this.lastName)) {
        this.name = `${this.firstName || ""} ${this.lastName || ""}`.trim();
    }
    if (!this.firstName && this.name) {
        const parts = this.name.split(" ");
        this.firstName = parts[0];
        this.lastName = parts.slice(1).join(" ");
    }
    next();
});

// index for better query performance
userSchema.index({ isActive: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ createdAt: 1 });

export const User = mongoose.model("User", userSchema);