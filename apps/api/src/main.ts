import express from 'express';
import cors from 'cors';
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { JobProcessor } from './services/job-processor';
import apiRoutes from './routes/index';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration for web interface
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.WEB_APP_URL || '').split(',').filter(Boolean)
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Global job processor instance
let jobProcessor: JobProcessor;

async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 Starting Job Digest Bot...');

    // Initialize job processor
    jobProcessor = new JobProcessor();
    await jobProcessor.initialize();

    // Test services on startup
    const servicesOk = await jobProcessor.testServices();
    if (!servicesOk) {
      console.error('❌ Service tests failed. Check your configuration.');
      process.exit(1);
    }

    console.log('✅ All services initialized successfully');

    // Schedule job processing every hour from 6 AM to 8 PM Manila time
    // (9 PM is reserved for daily summary)
    cron.schedule(
      '0 6-20 * * *',
      async () => {
        console.log('⏰ Running scheduled job processing...');
        try {
          await jobProcessor.queueJobProcessing('cron');
        } catch (error) {
          console.error('❌ Scheduled job processing failed:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Manila',
      }
    );

    // Schedule daily summary at 9 PM Manila time
    cron.schedule(
      '0 21 * * *',
      async () => {
        const currentTime = new Date().toISOString();
        console.log(`🌙 Running daily summary at ${currentTime} (9 PM Manila trigger)...`);
        try {
          await jobProcessor.queueDailySummary('cron');
          console.log('✅ Daily summary queued successfully');
        } catch (error) {
          console.error('❌ Daily summary failed:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Manila',
      }
    );

    console.log('⏱️ Scheduled job processing: 6 AM - 8 PM Manila time (hourly)');
    console.log('🌙 Scheduled daily summary: 9 PM Manila time daily');

    // Don't run initial job processing in development - use Telegram commands instead
    console.log('💡 Use Telegram commands to manually trigger processing in development mode');
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    process.exit(1);
  }
}

// Mount API routes
app.use('/', apiRoutes);

// Legacy endpoints (for backward compatibility)
app.post('/process', async (_, res) => {
  try {
    console.log('📨 Manual job processing triggered via API');
    await jobProcessor.processJobAlerts();
    res.json({ success: true, message: 'Job processing completed' });
  } catch (error) {
    console.error('❌ Manual job processing failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/daily-summary', async (_, res) => {
  try {
    console.log('🌙 Manual daily summary triggered via API');
    await jobProcessor.sendDailySummary();
    res.json({ success: true, message: 'Daily summary sent' });
  } catch (error) {
    console.error('❌ Manual daily summary failed:', error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Global error handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled API error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (jobProcessor) {
    await jobProcessor.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (jobProcessor) {
    await jobProcessor.cleanup();
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
app.listen(port, async () => {
  console.log(`🌐 Server running on port ${port}`);
  await initializeApp();
});

export default app;
