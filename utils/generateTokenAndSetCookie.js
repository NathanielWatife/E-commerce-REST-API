const jwt = require("jsonwebtoken");
const logger = require("./logger.js");

const generateTokenAndSetCookie = (res, userId) => {
    if (!process.env.JWT_SECRET) {
        logger.error("JWT_SECRET environment variable is not set!")
        throw new Error("JWT secret is not configured")
    }

    logger.debug(`Generating token for user: ${userId}`)

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });

    logger.debug("Token generated successfully")

    const isProd = process.env.NODE_ENV === 'production'

    // Build cookie options dynamically so we don't force a domain
    // (which can cause cookies to be rejected) and set secure/sameSite
    // appropriately for development vs production.
    const cookieOptions = {
        httpOnly: true,
        secure: isProd, // only send secure cookie over HTTPS in production
        sameSite: isProd ? 'none' : 'lax', // 'none' for cross-site in prod
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }

    // Allow an explicit domain via env when necessary (e.g. custom domain).
    if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN
    }

    res.cookie("token", token, cookieOptions);
    return token;
};

module.exports = { generateTokenAndSetCookie };