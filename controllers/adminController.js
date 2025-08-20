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
}