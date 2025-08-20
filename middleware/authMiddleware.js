import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

export const protect = async (req, res, next) => {
  let token

  // Check if token exists in cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token
  }
  // Also check if token is in the Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }
  else if (req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    })
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log("Token decoded sucessfully")

    // Get user from the token
    const user = await User.findById(decoded.userId).select("-password")
    console.log("User found:", user ? "Yes" : "No")

    if (!user) {
      console.log("User not found in database")
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    })
  }
}

// authMiddleware.js
export const admin = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "super-admin")) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Not authorized as an admin",
    });
  }
};

// Add super-admin middleware
export const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super-admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Not authorized as a super-admin",
    });
  }
};
