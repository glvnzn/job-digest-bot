import express from 'express';
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { JobProcessor } from './services/job-processor';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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
    
    // Schedule job processing every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running scheduled job processing...');
      try {
        await jobProcessor.queueJobProcessing('cron');
      } catch (error) {
        console.error('❌ Scheduled job processing failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    // Schedule daily summary at 9 PM UTC (adjust timezone as needed)
    cron.schedule('0 21 * * *', async () => {
      console.log('🌙 Running daily summary...');
      try {
        await jobProcessor.queueDailySummary('cron');
      } catch (error) {
        console.error('❌ Daily summary failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });
    
    console.log('⏱️ Scheduled job processing every hour');
    console.log('🌙 Scheduled daily summary at 9 PM UTC');
    
    // Don't run initial job processing in development - use Telegram commands instead
    console.log('💡 Use Telegram commands to manually trigger processing in development mode');
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    process.exit(1);
  }
}

// Basic health check endpoint
app.get('/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'job-digest-bot'
  });
});

// Manual trigger endpoint (for testing)
app.post('/process', async (_, res) => {
  try {
    console.log('📨 Manual job processing triggered via API');
    await jobProcessor.processJobAlerts();
    res.json({ success: true, message: 'Job processing completed' });
  } catch (error) {
    console.error('❌ Manual job processing failed:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Service test endpoint
app.get('/test-services', async (_, res) => {
  try {
    const result = await jobProcessor.testServices();
    res.json({ success: result, tested: ['Gmail', 'Telegram'] });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Manual daily summary trigger (for testing)
app.post('/daily-summary', async (_, res) => {
  try {
    console.log('🌙 Manual daily summary triggered via API');
    await jobProcessor.sendDailySummary();
    res.json({ success: true, message: 'Daily summary sent' });
  } catch (error) {
    console.error('❌ Manual daily summary failed:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
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
process.on('uncaughtException', (error) => {
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