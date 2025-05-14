import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import authRoutes  from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();

// middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  })
)

//  routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);


// error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? null : err.stack
  })
})


// not found error middleware handling
app.use((req, res, next) => {
  res.status(404).json({
    sucess: false,
    message: `Not found - ${req.originalUrl}`
  })
})



// port 
const PORT = process.env.PORT
app.listen(PORT, () => {
  connectDB();
  console.log(`Backend Server running on ${PORT}`);
});
