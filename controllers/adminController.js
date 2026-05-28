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
        const { data: recentOrders } = await Order.find({}, { limit: 5 });

        // Revenue from paid orders
        const { data: paidOrders } = await Order.find({ isPaid: true });
        const totalRevenue = (paidOrders || []).reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        // New users this month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const newUsersThisMonth = await User.countDocuments({ created_at: { $gte: startOfMonth } });

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
        const sortBy = req.query.sort || "created_at";
        const sortAsc = req.query.order === "asc";

        const query = {};
        if (role) query.role = role;
        if (status) query.accountStatus = status;
        if (verified !== undefined) query.isVerified = verified === "true";

        // Supabase full-text/ilike search across name & email
        const supabase = require('../config/db').getSupabase();
        let db = supabase.from('users').select('*', { count: 'exact' });
        if (role) db = db.eq('role', role);
        if (status) db = db.eq('accountStatus', status);
        if (verified !== undefined) db = db.eq('isVerified', verified === 'true');
        if (search) db = db.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        db = db.order(sortBy, { ascending: sortAsc });
        db = db.range(offset, offset + pageSize - 1);

        const { data: users, count, error } = await db;
        if (error) throw error;

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
        const { data: user, error: findError } = await User.findById(req.params.id);
        if (findError) throw findError;
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

        const { data: updatedUser, error: updateError } = await User.update(user.id, updates);
        if (updateError) throw updateError;

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
                created_at: updatedUser.created_at,
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
            const supabase = require('../config/db').getSupabase();
            const { data: superAdmins } = await supabase.from('users').select('id').in('id', userIds).eq('role', 'super-admin');
            if (superAdmins && superAdmins.length > 0) {
                return res.status(400).json({ success: false, message: "Cannot delete super-admin accounts" });
            }
            await supabase.from('users').delete().in('id', userIds).neq('role', 'super-admin');
            return res.status(200).json({ success: true, message: "Users deleted successfully" });
        }

        const updateMap = {
            activate: { isActive: true, accountStatus: "active" },
            deactivate: { isActive: false, accountStatus: "deactivated" },
            suspend: { isActive: false, accountStatus: "suspended" },
        };

        const update = updateMap[action];
        if (!update) return res.status(400).json({ success: false, message: "Invalid action" });

        const supabase = require('../config/db').getSupabase();
        const { data: result, error } = await supabase.from('users').update(update).in('id', userIds).neq('role', 'super-admin').select();
        if (error) throw error;

        return res.status(200).json({ success: true, message: `${action} applied successfully`, updatedCount: result?.length || 0 });
    } catch (error) {
        logger.error("Bulk user actions error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined });
    }
};

const getUserActivityLogs = async (req, res) => {
    try {
        const { data: user, error } = await User.findById(req.params.id);
        if (error) throw error;
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
        const { data: users, error } = await User.find({}, { sortField: 'created_at', sortAsc: false });
        if (error) throw error;

        if (!users || users.length === 0) return res.status(200).send('');

        const csvRows = users.map(u => ({
            Name: u.name || '',
            Email: u.email,
            Role: u.role,
            Verified: u.isVerified ? "Yes" : "No",
            Active: u.isActive ? "Yes" : "No",
            Status: u.accountStatus,
            'Last Login': u.lastLogin || '',
            'Created At': u.created_at
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

        const supabase = require('../config/db').getSupabase();
        let db = supabase.from('webhook_events').select('*', { count: 'exact' });

        if (req.query.provider) db = db.eq('provider', req.query.provider);
        if (req.query.status) db = db.eq('status', req.query.status);
        if (req.query.reference) db = db.eq('reference', req.query.reference);
        if (req.query.handled !== undefined) db = db.eq('handled', req.query.handled === 'true');
        if (req.query.q) db = db.ilike('event_id', `%${req.query.q}%`);

        db = db.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

        const { data: events, count, error } = await db;
        if (error) throw error;

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