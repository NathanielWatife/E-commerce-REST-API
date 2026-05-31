const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => Date.now().toString() },
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const loginHistorySchema = new mongoose.Schema(
  {
    ip: String,
    device: String,
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    billingAddress: { type: [addressSchema], default: [] },
    shippingAddress: { type: [addressSchema], default: [] },
    role: { type: String, enum: ['user', 'admin', 'super-admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    accountStatus: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    verificationToken: { type: String, default: null },
    verificationTokenExpiredAt: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiredAt: { type: Date, default: null },
    loginHistory: { type: [loginHistorySchema], default: [] },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.virtual('created_at').get(function createdAtAlias() {
  return this.createdAt;
});

userSchema.virtual('updated_at').get(function updatedAtAlias() {
  return this.updatedAt;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
module.exports.User = User;