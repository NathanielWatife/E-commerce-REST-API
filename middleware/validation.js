import { body } from "express-validator"

export const validateSignup = [
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

export const validateLogin = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  body("password").notEmpty().withMessage("Password is required"),
]

export const validateVerifyEmail = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),

  body("token").notEmpty().withMessage("Verification token is required"),
]

export const validateResendVerification = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
]

export const validateForgotPassword = [
  body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format"),
]

export const validateResetPassword = [
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



export const validateBulkActions = [
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

export const validateAdminUserUpdate = [
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