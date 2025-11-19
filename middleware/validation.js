const { body } = require("express-validator")

const validateSignup = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2-50 characters"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character"),
]

const validateLogin = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  body("password").notEmpty().withMessage("Password is required"),
]

const validateVerifyEmail = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  body("token").notEmpty().withMessage("Verification token is required"),
]

const validateResendVerification = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
]

const validateForgotPassword = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
]

const validateResetPassword = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  body("token").notEmpty().withMessage("Reset token is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one special character"),
]



const validateBulkActions = [
  body("action")
    .isIn(["activate", "deactivate", "suspend", "delete"])
    .withMessage("Invalid action"),
  body("userIds")
    .isArray()
    .withMessage("userIds must be an array")
    .custom((userIds) => {
      if (userIds.length === 0) {
        throw new Error("userIds array cannot be empty");
      }
      return true;
    }),
  body("userIds.*")
    .isMongoId()
    .withMessage("Invalid user ID"),
];

const validateAdminUserUpdate = [
  body("role")
    .optional()
    .isIn(["user", "admin", "super-admin"])
    .withMessage("Invalid role"),
  body("accountStatus")
    .optional()
    .isIn(["active", "suspended", "deactivated"])
    .withMessage("Invalid account status"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("isVerified must be a boolean"),
];

module.exports = {
  validateSignup,
  validateLogin,
  validateVerifyEmail,
  validateResendVerification,
  validateForgotPassword,
  validateResetPassword,
  validateBulkActions,
  validateAdminUserUpdate,
}