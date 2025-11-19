const { User } = require("../models/User.js");
const { Order } = require("../models/Order.js");
const { Product } = require("../models/Product.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");
const { WebhookEvent } = require("../models/WebhookEvent.js");

// get admin dashboarb statistics admin/private
const getDashBoardStatistics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: {
            $in: ["admin", "super-admin"]
        } });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select("_id totalPrice status createdAt user")
            .populate("user", "name email role");
        const revenueAgg = await Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalRevenue = revenueAgg.length ? revenueAgg[0].total : 0;

        const newUsersThisMonth = await User.countDocuments({
            createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        });

        const userGrowth = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt"},
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1}},
            { $limit: 6 }
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                users: {
                    totalUsers,
                    totalAdmins,
                    verifiedUsers,
                    activeUsers,
                    newUsersThisMonth,
                    userGrowth
                },
                products: {
                    totalProducts
                },
                orders: {
                    totalOrders,
                    totalRevenue,
                    recentOrders
                }
            }
        });
    } catch (error) {
        logger.error("Get dashboard statistics error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};


// get users with advanced filtering and sorting private(admin)
const getAdminUsers = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 20;
        const page = Number(req.query.page) || 1;
        const search = req.query.search || "";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const verified = req.query.verified;
        const sortBy = req.query.sort || "createdAt";
        const sortOrder = req.query.order === "asc" ? 1 : -1;

        let filter = {};

        if (search) {
            filter.$or = [
                {firstName: { $regex: search, $options: "i" }},
                {lastName: { $regex: search, $options: "i" }},
                {email: { $regex: search, $options: "i" }},
                {phoneNumber: { $regex: search, $options: "i" }},
            ];
        }
        if (role) filter.role = role;
        if (status) filter.accountStatus = status;
        if (verified !== undefined) filter.isVerified = verified === "true";

        const count = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select("-password")
            .sort({ [sortBy]: sortOrder })
            .limit(pageSize)
            .skip(pageSize * (page -1));

        return res.status(200).json({
            success: true,
            users,
            pagination: {
                page,
                pages: Math.ceil(count / pageSize),
                total: count,
                hasNext: page * pageSize < count,
                hasPrev: page > 1
            },
            filters: {
                search,
                role,
                status,
                verified,
                sortBy,
                sortOrder
            }
        });
    } catch (error) {
        logger.error("Get admin users error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};

// update user role private routes(admin)
const updateAdminUser = async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user){
            return res.status(404).json({
                success: false,
                message: "User not found as admin check details provided or contact support"
            });
        }

        // prevent modification of super-admin unless current is actually superadmin
        if(user.role === "super-admin" && req.user.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Cannot modify super-admin account, Contact support for assistance",
            });
        }

        const { role, accountStatus, isActive, isVerified } = req.body;
        if (role && ["user", "admin", "super-admin"].includes(role)) {
            user.role = role;
        }
        if (accountStatus && ["active", "suspended", "deactivated"].includes(accountStatus)) {
            user.accountStatus = accountStatus;
            // keep isActive boolean in sync
            user.isActive = accountStatus === "active";
        }
        if (isActive !== undefined) {
            user.isActive = Boolean(isActive);
            // auto derive accountStatus if not explicitly provided
            if (!accountStatus) {
                user.accountStatus = user.isActive ? "active" : user.accountStatus === "suspended" ? "suspended" : "deactivated";
            }
        }
        if (isVerified !== undefined) user.isVerified = isVerified;

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            user: {
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                isVerified: updatedUser.isVerified,
                isActive: updatedUser.isActive,
                accountStatus: updatedUser.accountStatus,
                phoneNumber: updatedUser.phoneNumber,
                lastLogin: updatedUser.lastLogin,
                createdAt: updatedUser.createdAt,
            }
        });
    } catch (error) {
        logger.error("Update admin user error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};


// bulk user actions private(admin)
const bulkUserActions = async (req, res) => {
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Action and user IDs are required",
        });
    }

    try {
        let update;
        let message;

        switch (action) {
            case "activate":
                update = { isActive: true, accountStatus: "active" };
                message = "User activated successfully";
                break;
            case "deactivate":
                update = { isActive: false, accountStatus: "deactivated" };
                message = "User deactivated successfully";
                break;
            case "suspend":
                update = { isActive: false, accountStatus: "suspended" };
                message = "User suspended successfully";
                break;
            case "delete":
                // prevent deletion of super-admin accounts
                const superAdmins = await User.countDocuments({
                    _id: { $in: userIds },
                    role: "super-admin"
                });
                if (superAdmins > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Cannot delete super-admin accounts, contact support for assistance"
                    });

                }
                await User.deleteMany({
                    _id: { $in: userIds },
                    role: { $ne: "super-admin" }
                });
                return res.status(200).json({
                    success: true,
                    message: "Users deleted successfully"
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid action"
                });    
        }
        
        const result = await User.updateMany(
            {
                _id: { $in: userIds },
                // prevent modification of super-admin unless current is actually superadmin
                ...(action !== "delete" ? { role: { $ne: "super-admin" } } : {})
            },
            update
        );
        return res.status(200).json({
            success: true,
            message,
            updatedCount: result.modifiedCount,
        });
    } catch (error) {
        logger.error("Bulk user actions error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};


// user activity logs private(admin)
const getUserActivityLogs = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("loginHistory lastLogin");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });

        }
        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                lastLogin: user.lastLogin,
                loginHistory: user.loginHistory.slice(-20).reverse()
            }
        });
    } catch (error) {
        logger.error("Get user activity logs error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};


// export user data private(admin)
const exportUserData = async (req, res) => {
    try {
        const users = await User.find({})
            .select("firstName lastName email phoneNumber role isVerified isActive accountStatus lastLogin createdAt")
            .sort({ createdAt: -1 });

        // convert exports to csv format
        const csvData = users.map(u => ({
            Name: `${u.firstName} ${u.lastName}`,
            Email: u.email,
            Role: u.role,
            Verified: u.isVerified ? "Yes" : "No",
            Active: u.isActive ? "Yes" : "No",
            Status: u.accountStatus,
            'Last Login': u.lastLogin,
            'Created At': u.createdAt
        }));

        if (csvData.length === 0) {
            return res.status(200).send('');
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="user_data.csv"');

        // csv conversion
        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');

        res.send(csv);
    } catch (error) {
        logger.error("Export user data error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV ? error.message : undefined,
        });
    }
};

// get webhook events (admin) with filters
const getWebhookEvents = async (req, res) => {
    try {
        const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const provider = req.query.provider;
        const handled = req.query.handled;
        const reference = req.query.reference;
        const status = req.query.status;
        const q = (req.query.q || '').trim();

        const filter = {};
        if (provider) filter.provider = provider;
        if (status) filter.status = status;
        if (reference) filter.reference = reference;
        if (handled !== undefined) filter.handled = handled === 'true';
        if (q) filter.eventId = { $regex: new RegExp(q, 'i') };

        const count = await WebhookEvent.countDocuments(filter);
        const events = await WebhookEvent.find(filter)
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .select('-raw'); // do not expose raw body by default

        // Mask sensitive payload fields lightly
        const masked = events.map(e => {
            const payload = e.payload || {};
            const safePayload = { ...payload };
            // redact email/account numbers if present
            try {
                if (safePayload.data?.customer?.email) {
                    const em = safePayload.data.customer.email;
                    const [user, domain] = em.split('@');
                    safePayload.data.customer.email = `${user?.slice(0,2) || ''}***@${domain || ''}`;
                }
                if (safePayload.data?.authorization?.account_number) {
                    const acc = safePayload.data.authorization.account_number;
                    safePayload.data.authorization.account_number = acc ? `****${String(acc).slice(-4)}` : acc;
                }
                if (safePayload.data?.card?.last_4) {
                    safePayload.data.card.last_4 = `****${safePayload.data.card.last_4}`;
                }
            } catch {}
            return { ...e.toObject(), payload: safePayload };
        });

        return res.status(200).json({
            success: true,
            events: masked,
            page,
            pages: Math.max(Math.ceil(count / pageSize), 1),
            count,
        });
    } catch (error) {
        logger.error('Get webhook events error:', error);
        return res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV ? error.message : undefined });
    }
}

module.exports = {
    getDashBoardStatistics,
    getAdminUsers,
    updateAdminUser,
    bulkUserActions,
    getUserActivityLogs,
    exportUserData,
    getWebhookEvents,
};