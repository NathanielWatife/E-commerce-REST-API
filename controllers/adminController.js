const User = require("../models/User.js");
const Order = require("../models/Order.js");
const Product = require("../models/Product.js");
const WebhookEvent = require("../models/WebhookEvent.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const getDashBoardStatistics = async (req, res) => {
    try {
        const [totalUsers, totalAdmins, verifiedUsers, activeUsers, totalProducts, totalOrders] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: 'admin' }), // Note: super-admin counted separately
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ isActive: true }),
            Product.countDocuments({}),
            Order.countDocuments({}),
        ]);

        // Recent orders
        const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).lean();

        // Revenue from paid orders
        const paidOrders = await Order.find({ isPaid: true }).lean();
        const totalRevenue = (paidOrders || []).reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        // New users this month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

        return res.status(200).json({
            success: true,
            stats: {
                users: { totalUsers, totalAdmins, verifiedUsers, activeUsers, newUsersThisMonth },
                products: { totalProducts },
                orders: { totalOrders, totalRevenue, recentOrders: recentOrders || [] }
            }
        });
    } catch (error) {
        logger.error("Get dashboard statistics error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const getAdminUsers = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 20;
        const page = Number(req.query.page) || 1;
        const offset = pageSize * (page - 1);
        const search = req.query.search || "";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const verified = req.query.verified;
        const sortBy = req.query.sort || "createdAt";
        const sortAsc = req.query.order === "asc";

        const query = {};
        if (role) query.role = role;
        if (status) query.accountStatus = status;
        if (verified !== undefined) query.isVerified = verified === "true";
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
        }

        const [users, count] = await Promise.all([
            User.find(query).sort({ [sortBy]: sortAsc ? 1 : -1 }).skip(offset).limit(pageSize).lean(),
            User.countDocuments(query),
        ]);

        const safeUsers = (users || []).map(({ password, ...u }) => u);

        return res.status(200).json({
            success: true,
            users: safeUsers,
            pagination: {
                page,
                pages: Math.ceil((count || 0) / pageSize),
                total: count || 0,
                hasNext: page * pageSize < (count || 0),
                hasPrev: page > 1
            },
            filters: { search, role, status, verified, sortBy, sortOrder: sortAsc ? 'asc' : 'desc' }
        });
    } catch (error) {
        logger.error("Get admin users error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const updateAdminUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.role === "super-admin" && req.user.role !== "super-admin") {
            return res.status(403).json({ success: false, message: "Cannot modify super-admin account" });
        }

        const { role, accountStatus, isActive, isVerified } = req.body;
        const updates = {};
        if (role && ["user", "admin", "super-admin"].includes(role)) updates.role = role;
        if (accountStatus && ["active", "suspended", "deactivated"].includes(accountStatus)) {
            updates.accountStatus = accountStatus;
            updates.isActive = accountStatus === "active";
        }
        if (isActive !== undefined) {
            updates.isActive = Boolean(isActive);
            if (!accountStatus) {
                updates.accountStatus = updates.isActive ? "active" : user.accountStatus === "suspended" ? "suspended" : "deactivated";
            }
        }
        if (isVerified !== undefined) updates.isVerified = isVerified;

        const updatedUser = await User.findByIdAndUpdate(user.id, updates, { new: true });

        return res.status(200).json({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                isVerified: updatedUser.isVerified,
                isActive: updatedUser.isActive,
                accountStatus: updatedUser.accountStatus,
                lastLogin: updatedUser.lastLogin,
                created_at: updatedUser.createdAt,
            }
        });
    } catch (error) {
        logger.error("Update admin user error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const bulkUserActions = async (req, res) => {
    const { action, userIds } = req.body;
    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: "Action and user IDs are required" });
    }

    try {
        if (action === "delete") {
            // Prevent deleting super-admins
            const superAdmins = await User.find({ _id: { $in: userIds }, role: 'super-admin' }).select('_id').lean();
            if (superAdmins && superAdmins.length > 0) {
                return res.status(400).json({ success: false, message: "Cannot delete super-admin accounts" });
            }
            await User.deleteMany({ _id: { $in: userIds }, role: { $ne: 'super-admin' } });
            return res.status(200).json({ success: true, message: "Users deleted successfully" });
        }

        const updateMap = {
            activate: { isActive: true, accountStatus: "active" },
            deactivate: { isActive: false, accountStatus: "deactivated" },
            suspend: { isActive: false, accountStatus: "suspended" },
        };

        const update = updateMap[action];
        if (!update) return res.status(400).json({ success: false, message: "Invalid action" });

        const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'super-admin' } }, { $set: update });

        return res.status(200).json({ success: true, message: `${action} applied successfully`, updatedCount: result?.modifiedCount || 0 });
    } catch (error) {
        logger.error("Bulk user actions error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const getUserActivityLogs = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const loginHistory = Array.isArray(user.loginHistory) ? user.loginHistory.slice(-20).reverse() : [];

        return res.status(200).json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, lastLogin: user.lastLogin, loginHistory }
        });
    } catch (error) {
        logger.error("Get user activity logs error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const exportUserData = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();

        if (!users || users.length === 0) return res.status(200).send('');

        const csvRows = users.map(u => ({
            Name: u.name || '',
            Email: u.email,
            Role: u.role,
            Verified: u.isVerified ? "Yes" : "No",
            Active: u.isActive ? "Yes" : "No",
            Status: u.accountStatus,
            'Last Login': u.lastLogin || '',
            'Created At': u.createdAt
        }));

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user_data.csv"');
        const csv = [Object.keys(csvRows[0]).join(','), ...csvRows.map(row => Object.values(row).join(','))].join('\n');
        res.send(csv);
    } catch (error) {
        logger.error("Export user data error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const getWebhookEvents = async (req, res) => {
    try {
        const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const offset = pageSize * (page - 1);

        const query = {};
        if (req.query.provider) query.provider = req.query.provider;
        if (req.query.status) query.status = req.query.status;
        if (req.query.reference) query.reference = req.query.reference;
        if (req.query.handled !== undefined) query.handled = req.query.handled === 'true';
        if (req.query.q) query.eventId = { $regex: req.query.q, $options: 'i' };

        const [events, count] = await Promise.all([
            WebhookEvent.find(query).sort({ createdAt: -1 }).skip(offset).limit(pageSize).lean(),
            WebhookEvent.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            events: events || [],
            page,
            pages: Math.max(Math.ceil((count || 0) / pageSize), 1),
            count: count || 0,
        });
    } catch (error) {
        logger.error('Get webhook events error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV ? error.message : undefined });
    }
};

module.exports = {
    getDashBoardStatistics,
    getAdminUsers,
    updateAdminUser,
    bulkUserActions,
    getUserActivityLogs,
    exportUserData,
    getWebhookEvents,
};