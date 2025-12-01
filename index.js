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

// CORS Configuration - MUST be before any routes
const allowedOrigins = [
  process.env.CLIENT_URL,
  ];

if (process.env.CLIENT_URL) {
  const envOrigins = process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean);
  envOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

const corsOptions = {
  credentials: true,
  origin: function (incomingOrigin, callback) {
    if (!incomingOrigin) return callback(null, true);

    if (allowedOrigins.includes(incomingOrigin)) return callback(null, true);

    try {
      const incomingHostname = new URL(incomingOrigin).hostname;
      if (incomingHostname.endsWith('.vercel.app')) return callback(null, true);
    } catch (e) {
    }

    logger.warn(`CORS blocked origin: ${incomingOrigin}`);
    return callback(null, false);
  },
  optionsSuccessStatus: 200,
  maxAge: 600,
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (isServerless) {
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
  mongoConfigured: !!process.env.MONGO_URI
}))

const __uploads = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(__uploads))

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not found - ${req.originalUrl}`
  })
})

app.use((err, req, res, next) => {
  logger.error('Express error handler:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
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
