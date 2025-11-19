const express = require("express");
const {
    getDashBoardStatistics,
    getAdminUsers,
    updateAdminUser,
    bulkUserActions,
    getUserActivityLogs,
    exportUserData,
    getWebhookEvents
} = require("../controllers/adminController.js");
const { protect, admin } = require("../middleware/authMiddleware.js");
const { body } = require("express-validator");

const router = express.Router();

// validation middleware
const validateUpdateAdminUser = [
    body("role").optional().isIn(["user", "admin", "super-admin"]).withMessage("Invalid role"),
    body("accountStatus").optional().isIn(["active", "suspended", "deactivated"]).withMessage("Invalid status"),
    body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
    body("isVerified").optional().isBoolean().withMessage("isVerified must be a boolean"),
];
  
const validateBulkActions = [
    body("action").isIn(["activate", "deactivate", "suspend", "delete"]).withMessage("Invalid action"),
    body("userIds").isArray().withMessage("userIds must be an array"),
    body("userIds.*").isMongoId().withMessage("Invalid user ID"),
];

// Admin dashboard statistics
router.get("/dashboard", protect, admin, getDashBoardStatistics);
router.get("/users", protect, admin, getAdminUsers);
router.put("/users/:id", protect, admin, validateUpdateAdminUser, updateAdminUser);
router.post("/users/bulk", protect, admin, validateBulkActions, bulkUserActions);
router.get("/users/:id/activity", protect, admin, getUserActivityLogs);
router.get("/users/export", protect, admin, exportUserData);
router.get("/webhook-events", protect, admin, getWebhookEvents);

module.exports = router;