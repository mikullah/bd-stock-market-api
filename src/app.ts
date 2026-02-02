import "reflect-metadata";
import "dotenv/config";
import express from "express";
import { createExpressServer, useContainer } from "routing-controllers";
import { Container } from "typedi";
import { PriceController } from "./controllers/DseController";
import { GlobalErrorHandler } from "./middlewares/ErrorMiddleware";
import cors from "cors";

useContainer(Container);

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Static files
app.use(express.static('public'));

// API info endpoint
app.get('/api-info', (_req, res) => {
  return res.json({
    name: 'Bangladesh Stock Market API',
    version: '1.0.0',
    description: 'Unofficial API for Bangladesh Stock Exchange data',
    endpoints: {
      health: 'GET /health',
      latest: 'GET /v1/dse/latest',
      dsexData: 'GET /v1/dse/dsexdata?symbol=<optional>',
      top30: 'GET /v1/dse/top30',
      historical: 'GET /v1/dse/historical?start=<date>&end=<date>&code=<optional>',
      hello: 'GET /v1/dse/hello'
    },
    documentation: 'Visit the root URL for interactive documentation'
  });
});

// routing-controllers setup
const expressApp = createExpressServer({
  controllers: [PriceController],
  middlewares: [GlobalErrorHandler],
  defaultErrorHandler: false
});

// Mount controller routes
app.use(expressApp);

// 404 handler
app.use('*', (_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /v1/dse/latest',
      'GET /v1/dse/dsexdata',
      'GET /v1/dse/top30',
      'GET /v1/dse/historical'
    ]
  });
});

// Global fallback error handler (VERY IMPORTANT)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// Start server (Render uses dynamic port)
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Bangladesh Stock Market API is running on port ${PORT}`);
  console.log(`📊 Health endpoint ready`);
  console.log(`📖 API endpoints ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;
