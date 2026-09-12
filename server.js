require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const { apiLimiter }    = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const incidentRoutes = require('./routes/incidents');
const routeRoutes    = require('./routes/routes');
const sosRoutes      = require('./routes/sos');
const statsRoutes    = require('./routes/stats');
const chatRoutes     = require('./routes/chat');
const safePlacesRoutes = require('./routes/safePlaces');
const journeyRoutes  = require('./routes/journey');
const emergencyRoutes = require('./routes/emergency');

// ─── App Initialization ─────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin '${origin}' is not allowed.`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Request Parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafeRoute AI API is running.',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/incidents', incidentRoutes);
app.use('/api/routes',    routeRoutes);
app.use('/api/sos',       sosRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/safe-places', safePlacesRoutes);
app.use('/api/journey',   journeyRoutes);
app.use('/api/emergency', emergencyRoutes);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🛡️ Welcome to SafeRoute AI API',
    version: '1.0.0',
    endpoints: {
      health:    'GET  /health',
      incidents: {
        report:  'POST /api/incidents',
        list:    'GET  /api/incidents',
        detail:  'GET  /api/incidents/:id',
      },
      routes: {
        analyze: 'POST /api/routes/analyze',
      },
      sos: {
        trigger: 'POST /api/sos',
        list:    'GET  /api/sos',
      },
      stats:     'GET  /api/stats',
    },
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         🛡️  SafeRoute AI Backend          ║
  ╠══════════════════════════════════════════╣
  ║  Status      : Running                   ║
  ║  Port        : ${PORT}                          ║
  ║  Environment : ${(process.env.NODE_ENV || 'development').padEnd(26)}║
  ║  Health URL  : http://localhost:${PORT}/health ║
  ╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SafeRoute] SIGTERM received — shutting down gracefully...');
  server.close(() => {
    console.log('[SafeRoute] Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SafeRoute] SIGINT received — shutting down gracefully...');
  server.close(() => {
    console.log('[SafeRoute] Server closed.');
    process.exit(0);
  });
});

module.exports = app;
