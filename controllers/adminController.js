import { User } from "../models/User.js";
import { validationResult } from "express-validator";

// get admin dashboarb statistics admin/private
export const getDashBoardStatistics = async (req, res) => {
    try {
        // get total users
        const totalUsers = await User.countDocuments.countDocuments();
        const totalAdmins = await User.countDocuments({ role: {
            $in: ["admin", "super-admin"]
        } });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const activeUsers = await User.countDocuments({ isActive: true });

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
                totalUsers,
                totalAdmins,
                verifiedUsers,
                activeUsers,
                newUsersThisMonth,
                userGrowth
            }
        });
    } catch (error) {
        console.error("Get dashboard statistics error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


// get users with advanced filtering and sorting private(admin)
export const getAdminUsers = async (req, res) => {
    try {
        const pageSize = Number(req.query.pageSize) || 20;
        const page = Number(req.query.page) || 1;
        const search = req.query.search || "";
        const role = req.query.role || "";
        const status = req.query.status || "";
        const verified = req.query.verified;
        const sortBy = req.query.sort || "createdAt";
        const sortOrder = req.query.order === "asc" ? 1 : -1;

        // filter the objects
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
            sucess: true,
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
        console.error("Get admin users error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

// update user role private routes(admin)
export const updateAdminUser = async (req, res) => {
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
                succes: false,
                message: "User not found as admin check details provided or contact support"
            });
        }

        // prevent modification of super-admin unless current is actually superadmin
        if(user.role === "super-admin" && req.user.role !== "super-admin") {
            return res.status(403).json({
                succes: false,
                message: "Cannot modify super-admin account, Contact support for assistance",
            });
        }

        const { role, accountStatus, isActive, isVerified } = req.body;

        // update user fields
        if (role && ["user", "admin", "super-admin"].includes(role)) {
            user.role = role;
        }
        if (accountStatus && ["active", "suspended", "deactivated"].includes(accountStatus)) {
            user.accountStatus = accountStatus;
        }
        if (isActive !== undefined) user.isActive = isActive;
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
        console.error("Update admin user error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


// bulk user actions private(admin)
export const bulkUserActions = async (req, res) => {
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
                    sucess: true,
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
        );
        return res.status(200).json({
            success: true,
            message,
            updatedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Bulk user actions error:", error);
        return res.status(500).json({
            sucess: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


// user activity logs private(admin)
export const getUserActivityLogs = async (req, res) => {
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
        console.error("Get user activity logs error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};


// export user data private(admin)
export const exportUserData = async (req, res) => {
    try {
        const user = await User.find({})
            .select("firstName lastName email phoneNumber role isVerified isActive accountStatus lastLogin createdAt")
            .sort({ createdAt: -1 });
        
            // convert exports to csv format
            const csvData = users.map(user => ({
                Name: `${user.firstName} ${user.lastName}`,
                Email: user.email,
                Role: user.role,
                Verified: user.isVerified ? "Yes" : "No",
                Active: user.isActive ? "Yes" : "No",
                Status: user.accountStatus,
                'Last Login': user.lastLogin,
                'Created At': user.createdAt
            }));

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="user_data.csv"');

            // csv conversion
            const csv = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map(row => Object.values(row).join(','))
            ].join('\n');

            res.send(csv);
    } catch (error) {
        console.error("Export user data error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};