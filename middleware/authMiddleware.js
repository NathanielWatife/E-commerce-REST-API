const jwt = require("jsonwebtoken")
const { User } = require("../models/User.js")
const logger = require("../utils/logger.js")

const protect = async (req, res, next) => {
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
  logger.debug("Token decoded successfully")

    // Get user from the token
  const { data: user, error: findError } = await User.findById(decoded.userId)
  if (findError) throw findError;
  logger.debug(`User found: ${user ? 'Yes' : 'No'}`)

    if (!user) {
      logger.warn("User not found in database")
      return res.status(401).json({
        success: false,
        message: "User not found",
      })
    }

    req.user = user
    next()
  } catch (error) {
    logger.error("Auth middleware error:", error)
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    })
  }
}

// authMiddleware.js
const admin = (req, res, next) => {
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
const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super-admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Not authorized as a super-admin",
    });
  }
};

module.exports = {
  protect,
  admin,
  superAdmin,
}
