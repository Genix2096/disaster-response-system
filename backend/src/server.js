const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const incidentRoutes = require('./routes/incidentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ---- Middleware ----
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', { method: req.method, path: req.path });
  next();
});

// ---- Routes ----

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'disaster-response-backend',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Centralized error handler
app.use(errorHandler);

// ---- Start Server ----
app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    env: config.nodeEnv,
    frontendUrl: config.frontendUrl,
  });
  console.log(`\n🚀 Disaster Response Backend running on http://localhost:${config.port}`);
  console.log(`📋 Health check: http://localhost:${config.port}/api/health\n`);
});
