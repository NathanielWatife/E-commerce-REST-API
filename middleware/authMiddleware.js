import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

export const protect = async (req, res, next) => {
  let token

  // Check if token exists in cookies
  if (req.cookies.token) {
    token = req.cookies.token
  }
  // Also check if token is in the Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1]
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    })
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SEC)

    // Get user from the token
    req.user = await User.findById(decoded.userId).select("-password")

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    next()
  } catch (error) {
    console.error("Auth middleware error:", error)
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    })
  }
}

export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    return res.status(403).json({
      success: false,
      message: "Not authorized as an admin",
    })
  }
}
