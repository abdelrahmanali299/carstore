require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./config/database');
require('./models/index'); // ensure all models registered before sync
require('./config/passport');

// Routes
const authRoutes = require('./routes/auth.routes');
const carRoutes = require('./routes/car.routes');
const listingRoutes = require('./routes/listing.routes');
const userRoutes = require('./routes/user.routes');
const modelRoutes = require('./routes/model.routes');
const cartRoutes = require('./routes/cart.routes');

const app = express();

// ================================
// SECURITY MIDDLEWARE
// ================================
app.use(helmet());
app.use(cors({
  origin: '*', // Tighten this to your domain in production if needed
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
// Note: on Vercel serverless, each invocation is stateless so rate limiting
// is per-instance. For strict rate limiting use Upstash Redis (free tier).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ================================
// GENERAL MIDDLEWARE
// ================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(passport.initialize());

// ================================
// ROUTES
// ================================
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/cart', cartRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CarStore API is running 🚗', version: '1.0.0' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ================================
// DB CONNECT + SERVER START
// Vercel: module.exports = app is enough (Vercel calls it as a function).
// Local: we still call app.listen() when not in a serverless environment.
// ================================
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connected');
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced');
      app.listen(PORT, () => {
        console.log(`🚗 CarStore API → http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('❌ Startup error:', err);
      process.exit(1);
    }
  })();
} else {
  // On Vercel: connect DB on first request (connection is reused across warm invocations)
  let dbReady = false;
  app.use(async (req, res, next) => {
    if (!dbReady) {
      try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        dbReady = true;
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Database connection failed' });
      }
    }
    next();
  });
}

module.exports = app;
