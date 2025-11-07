import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes  from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notesRoutes from './routes/notesRoutes.js'
import requestLogger from './middleware/requestLogger.js'
import logger from "./utils/logger.js";

dotenv.config();
const app = express();

// middleware
app.use(express.json());
app.use(cookieParser());
// request logger
app.use(requestLogger);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    // allow preflight cache for 600 seconds
    optionsSuccessStatus: 200,
    maxAge: 600,
  })
)

//  routes
app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/users", userRoutes)
app.use("/api/products", productRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/cart", cartRoutes)
app.use('/api/notes', notesRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/payments", paymentRoutes)

// simple health check
app.get('/api/health', (req, res) => res.status(200).json({ ok: true }))


// error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  res.json({
    success: false,
    message: err.message,
    // include stack trace in development only
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  })
})


// not found error middleware handling
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not found - ${req.originalUrl}`
  })
})



// port 
const PORT = process.env.PORT
app.listen(PORT, () => {
  connectDB();
  logger.info(`Backend Server running on ${PORT}`);
});
