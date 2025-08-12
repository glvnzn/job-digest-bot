import { Pool } from 'pg';
import { JobListing, ResumeAnalysis, ProcessedEmail } from '../models/types';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async init(): Promise<void> {
    try {
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const createJobsTable = `
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR PRIMARY KEY,
        title VARCHAR NOT NULL,
        company VARCHAR NOT NULL,
        location VARCHAR,
        is_remote BOOLEAN DEFAULT FALSE,
        description TEXT,
        requirements TEXT[],
        apply_url VARCHAR NOT NULL,
        salary VARCHAR,
        posted_date TIMESTAMP,
        source VARCHAR NOT NULL,
        relevance_score FLOAT,
        email_message_id VARCHAR NOT NULL,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createResumeAnalysisTable = `
      CREATE TABLE IF NOT EXISTS resume_analysis (
        id SERIAL PRIMARY KEY,
        skills TEXT[],
        experience TEXT[],
        preferred_roles TEXT[],
        seniority VARCHAR,
        analyzed_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const createProcessedEmailsTable = `
      CREATE TABLE IF NOT EXISTS processed_emails (
        message_id VARCHAR PRIMARY KEY,
        subject VARCHAR,
        from_email VARCHAR,
        processed_at TIMESTAMP DEFAULT NOW(),
        jobs_extracted INTEGER DEFAULT 0,
        deleted BOOLEAN DEFAULT FALSE
      );
    `;

    await this.pool.query(createJobsTable);
    await this.pool.query(createResumeAnalysisTable);
    await this.pool.query(createProcessedEmailsTable);
  }

  async saveJob(job: JobListing): Promise<void> {
    const query = `
      INSERT INTO jobs (id, title, company, location, is_remote, description, requirements, 
                       apply_url, salary, posted_date, source, relevance_score, 
                       email_message_id, processed, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        relevance_score = EXCLUDED.relevance_score,
        processed = EXCLUDED.processed
    `;

    const values = [
      job.id,
      job.title,
      job.company,
      job.location,
      job.isRemote,
      job.description,
      job.requirements,
      job.applyUrl,
      job.salary,
      job.postedDate,
      job.source,
      job.relevanceScore,
      job.emailMessageId,
      job.processed,
      job.createdAt,
    ];

    await this.pool.query(query, values);
  }

  async saveResumeAnalysis(analysis: ResumeAnalysis): Promise<void> {
    const query = `
      INSERT INTO resume_analysis (skills, experience, preferred_roles, seniority, analyzed_at)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [
      analysis.skills,
      analysis.experience,
      analysis.preferredRoles,
      analysis.seniority,
      analysis.analyzedAt,
    ];

    await this.pool.query(query, values);
  }

  async saveProcessedEmail(email: ProcessedEmail): Promise<void> {
    const query = `
      INSERT INTO processed_emails (message_id, subject, from_email, processed_at, jobs_extracted, deleted)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (message_id) DO UPDATE SET
        deleted = EXCLUDED.deleted
    `;

    const values = [
      email.messageId,
      email.subject,
      email.from,
      email.processedAt,
      email.jobsExtracted,
      email.deleted,
    ];

    await this.pool.query(query, values);
  }

  async getLatestResumeAnalysis(): Promise<ResumeAnalysis | null> {
    const query = `
      SELECT * FROM resume_analysis 
      ORDER BY analyzed_at DESC 
      LIMIT 1
    `;

    const result = await this.pool.query(query);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      skills: row.skills,
      experience: row.experience,
      preferredRoles: row.preferred_roles,
      seniority: row.seniority,
      analyzedAt: row.analyzed_at,
    };
  }

  async isEmailProcessed(messageId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM processed_emails WHERE message_id = $1';
    const result = await this.pool.query(query, [messageId]);
    return result.rows.length > 0;
  }

  async getRelevantJobs(minScore: number = 0.7): Promise<JobListing[]> {
    const query = `
      SELECT * FROM jobs 
      WHERE relevance_score >= $1 AND is_remote = TRUE AND processed = FALSE
      ORDER BY relevance_score DESC, created_at DESC
    `;

    const result = await this.pool.query(query, [minScore]);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      isRemote: row.is_remote,
      description: row.description,
      requirements: row.requirements,
      applyUrl: row.apply_url,
      salary: row.salary,
      postedDate: row.posted_date,
      source: row.source,
      relevanceScore: row.relevance_score,
      emailMessageId: row.email_message_id,
      processed: row.processed,
      createdAt: row.created_at,
    }));
  }

  async markJobAsProcessed(jobId: string): Promise<void> {
    const query = 'UPDATE jobs SET processed = TRUE WHERE id = $1';
    await this.pool.query(query, [jobId]);
  }

  async getDailyJobSummary(date: Date): Promise<JobListing[]> {
    // Convert Manila "day" to UTC time range for database query
    // date parameter is already a Manila date (midnight to midnight Manila time)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    // Subtract 8 hours to convert Manila time to UTC
    const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    // Subtract 8 hours to convert Manila time to UTC
    const endOfDayUTC = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000);

    console.log(
      `Daily summary query range (Manila day converted to UTC): ${startOfDayUTC.toISOString()} to ${endOfDayUTC.toISOString()}`
    );

    const query = `
      SELECT * FROM jobs 
      WHERE created_at >= $1 AND created_at <= $2 AND relevance_score >= 0.6
      ORDER BY relevance_score DESC, created_at DESC
    `;

    const result = await this.pool.query(query, [startOfDayUTC, endOfDayUTC]);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      isRemote: row.is_remote,
      description: row.description,
      requirements: row.requirements,
      applyUrl: row.apply_url,
      salary: row.salary,
      postedDate: row.posted_date,
      source: row.source,
      relevanceScore: row.relevance_score,
      emailMessageId: row.email_message_id,
      processed: row.processed,
      createdAt: row.created_at,
    }));
  }

  async getDailyStats(date: Date): Promise<{
    totalJobsProcessed: number;
    relevantJobs: number;
    emailsProcessed: number;
    topSources: Array<{ source: string; count: number }>;
  }> {
    // Convert Manila "day" to UTC time range for database query
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfDayUTC = new Date(startOfDay.getTime() - 8 * 60 * 60 * 1000);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    const endOfDayUTC = new Date(endOfDay.getTime() - 8 * 60 * 60 * 1000);

    console.log(
      `Daily stats query range (Manila day converted to UTC): ${startOfDayUTC.toISOString()} to ${endOfDayUTC.toISOString()}`
    );

    // Get total jobs processed today
    const totalJobsQuery = `
      SELECT COUNT(*) as count FROM jobs 
      WHERE created_at >= $1 AND created_at <= $2
    `;
    const totalJobsResult = await this.pool.query(totalJobsQuery, [startOfDayUTC, endOfDayUTC]);

    // Get relevant jobs count
    const relevantJobsQuery = `
      SELECT COUNT(*) as count FROM jobs 
      WHERE created_at >= $1 AND created_at <= $2 AND relevance_score >= 0.6
    `;
    const relevantJobsResult = await this.pool.query(relevantJobsQuery, [
      startOfDayUTC,
      endOfDayUTC,
    ]);

    // Get emails processed today
    const emailsQuery = `
      SELECT COUNT(*) as count FROM processed_emails 
      WHERE processed_at >= $1 AND processed_at <= $2
    `;
    const emailsResult = await this.pool.query(emailsQuery, [startOfDayUTC, endOfDayUTC]);

    // Get top sources
    const sourcesQuery = `
      SELECT source, COUNT(*) as count FROM jobs 
      WHERE created_at >= $1 AND created_at <= $2 AND relevance_score >= 0.6
      GROUP BY source 
      ORDER BY count DESC 
      LIMIT 5
    `;
    const sourcesResult = await this.pool.query(sourcesQuery, [startOfDayUTC, endOfDayUTC]);

    return {
      totalJobsProcessed: parseInt(totalJobsResult.rows[0].count),
      relevantJobs: parseInt(relevantJobsResult.rows[0].count),
      emailsProcessed: parseInt(emailsResult.rows[0].count),
      topSources: sourcesResult.rows.map((row) => ({
        source: row.source,
        count: parseInt(row.count),
      })),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
