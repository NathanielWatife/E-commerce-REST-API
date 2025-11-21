const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("./utils/ensureDebugCommon.js");
const { connectDB } = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const productRoutes = require('./routes/productRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const cartRoutes = require("./routes/cartRoutes.js");
const orderRoutes = require("./routes/orderRoutes.js");
const paymentRoutes = require("./routes/paymentRoutes.js");
const notesRoutes = require('./routes/notesRoutes.js');
const chatbotRoutes = require('./routes/chatbotRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes.js');
const contactRoutes = require('./routes/contactRoutes.js');
const requestLogger = require('./middleware/requestLogger.js');
const logger = require("./utils/logger.js");
const { paystackWebhook, flutterwaveWebhook } = require('./controllers/paymentController.js');
const { startPaymentReconciler } = require('./utils/paymentReconciler.js');

dotenv.config();
const app = express();

app.post('/api/payments/paystack/webhook', express.raw({ type: 'application/json' }), paystackWebhook)
app.post('/api/payments/flutterwave/webhook', express.raw({ type: 'application/json' }), flutterwaveWebhook)


app.use(express.json());
app.use(cookieParser());

app.use(requestLogger);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 600,
  })
)


app.use("/api/auth", authRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/users", userRoutes)
app.use("/api/products", productRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/cart", cartRoutes)
app.use('/api/notes', notesRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/payments", paymentRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/contact', contactRoutes)


app.get('/api/health', (req, res) => res.status(200).json({ ok: true }))

const __uploads = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(__uploads))

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode)
  res.json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV ? err.stack : undefined
  })
})

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not found - ${req.originalUrl}`
  })
})



const PORT = process.env.PORT
app.listen(PORT, () => {
  connectDB();
  logger.info(`Backend Server running on ${PORT}`);
  try { startPaymentReconciler(); } catch (e) { logger.warn('Reconciler failed to start', e); }
});
