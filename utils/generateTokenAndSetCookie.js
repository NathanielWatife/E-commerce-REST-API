import jwt from "jsonwebtoken";


export const generateTokenAndSetCookie = (res, userId) => {
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SEC environment variable is not set!")
        throw new Error("JWT secet is not configured")
    }

    console.log("Generating token for user:", userId)

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });

    console.log("Token generated successfully")

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 1000,
    });
    return token;
};