const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
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
const debugRoutes = require('./routes/debugRoutes.js');
const requestLogger = require('./middleware/requestLogger.js');
const logger = require("./utils/logger.js");
const { paystackWebhook, flutterwaveWebhook } = require('./controllers/paymentController.js');
const { startPaymentReconciler } = require('./utils/paymentReconciler.js');
const { initSuperAdmin } = require('./utils/initSuperAdmin.js');

dotenv.config();
const app = express();

if (process.env.TRUST_PROXY === 'true' || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Database connection middleware for serverless
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (isServerless) {
  // In serverless, ensure DB connection before each request
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      logger.error('Database connection failed in request middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }
  });
}

app.post('/api/payments/paystack/webhook', express.raw({ type: 'application/json' }), paystackWebhook)
app.post('/api/payments/flutterwave/webhook', express.raw({ type: 'application/json' }), flutterwaveWebhook)


app.use(express.json());
app.use(cookieParser());

app.use(requestLogger);
{
  const raw = (process.env.CLIENT_URL || "").toString();
  const allowed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Build a set of allowed hostnames (without protocol) for flexible matching
  const allowedHostnames = new Set();
  allowed.forEach((entry) => {
    try {
      // If entry is a full origin (has protocol), extract hostname
      if (/^https?:\/\//i.test(entry)) {
        const u = new URL(entry);
        allowedHostnames.add(u.hostname);
      } else {
        // hostname-only entry
        allowedHostnames.add(entry.replace(/:\d+$/, ''));
      }
    } catch (e) {
      // Fallback: treat as hostname
      allowedHostnames.add(entry.replace(/:\d+$/, ''));
    }
  });

  const corsOptions = {
    credentials: true,
    origin: function (incomingOrigin, callback) {
      // If no origin (e.g. curl, same-site requests), allow it
      if (!incomingOrigin) return callback(null, true);

      // Exact match against configured origins (preserves protocol/port if provided)
      if (allowed.indexOf(incomingOrigin) !== -1) return callback(null, true);

      // Try matching hostname-only entries (e.g. `ray-dazzle.vercel.app`)
      try {
        const incomingHostname = new URL(incomingOrigin).hostname;
        if (allowedHostnames.has(incomingHostname)) return callback(null, true);

        // Allow dynamic vercel subdomains when any allowed origin includes 'vercel.app'
        const allowedIncludesVercel = Array.from(allowedHostnames).some(h => h.includes('vercel.app'));
        if (allowedIncludesVercel && incomingHostname.endsWith('.vercel.app')) return callback(null, true);
      } catch (e) {
        // If parsing fails, fall through to reject
      }

      const err = new Error('CORS policy: origin not allowed');
      // Attach allowed origins/hostnames to the error to help debugging in logs
      err.allowedOrigins = allowed;
      err.allowedHostnames = Array.from(allowedHostnames);
      return callback(err, false);
    },
    optionsSuccessStatus: 200,
    maxAge: 600,
  };

  app.use(cors(corsOptions));
}

// Debug cookie logger in non-production to help verify cookies are set and sent
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug('Incoming request for debug:', {
      path: req.path,
      origin: req.headers.origin,
      cookies: req.cookies,
    });
    next();
  });
}


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

// Root route - API info
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Raddazle E-commerce API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      users: '/api/users',
      admin: '/api/admin'
    }
  })
})

app.get('/api/health', (req, res) => res.status(200).json({ 
  ok: true,
  environment: process.env.NODE_ENV,
  mongooseState: require('mongoose').connection.readyState,
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  mongoConfigured: !!process.env.MONGO_URI
}))

const __uploads = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(__uploads))

// 404 handler - must come before error handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not found - ${req.originalUrl}`
  })
})

// Global error handler - Express 5 compatible
app.use((err, req, res, next) => {
  // Log the error
  logger.error('Express error handler:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})



const PORT = process.env.PORT
app.listen(PORT, async () => {
  try {
    await connectDB();
    logger.info(`Backend Server running on ${PORT}`);
    
    // Auto-initialize super admin on startup
    await initSuperAdmin();
    
    // Start payment reconciler
    try { 
      startPaymentReconciler(); 
    } catch (e) { 
      logger.warn('Reconciler failed to start', e); 
    }
  } catch (error) {
    logger.error('Server startup error:', error);
  }
});
