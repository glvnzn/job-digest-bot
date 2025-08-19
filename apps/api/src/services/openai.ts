import OpenAI from 'openai';
import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import * as crypto from 'crypto';
import { ResumeAnalysis, JobListing } from '../models/types';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeResume(resumePath: string): Promise<ResumeAnalysis> {
    try {
      const resumeText = await this.extractTextFromPDF(resumePath);

      const prompt = `
        Analyze this resume and extract key information for job matching:

        Resume Content:
        ${resumeText}

        Please return a JSON object with the following structure:
        {
          "skills": ["skill1", "skill2", ...],
          "experience": ["experience1", "experience2", ...],
          "preferredRoles": ["role1", "role2", ...],
          "seniority": "junior|mid|senior|lead|principal"
        }

        Focus on:
        - Technical skills (especially React, JavaScript, frontend technologies)
        - Years of experience and seniority level
        - Preferred job titles/roles
        - Key experience highlights
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing resumes. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      return {
        skills: analysis.skills || [],
        experience: analysis.experience || [],
        preferredRoles: analysis.preferredRoles || [],
        seniority: analysis.seniority || 'mid',
        analyzedAt: new Date(),
      };
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  }

  async classifyEmailsBatch(
    emails: Array<{ id: string; subject: string; from: string; body: string }>
  ): Promise<Array<{ id: string; isJobRelated: boolean; confidence: number }>> {
    try {
      // Process emails in smaller batches for efficiency
      const batchSize = 10;
      const results: Array<{ id: string; isJobRelated: boolean; confidence: number }> = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        const emailSummaries = batch.map(email => ({
          id: email.id,
          from: email.from,
          subject: email.subject,
          bodyPreview: email.body.substring(0, 500), // First 500 chars for efficiency
        }));

        const prompt = `
          Analyze these emails and determine which ones contain job opportunities or career-related content:

          ${emailSummaries
            .map(
              (email, idx) => `
          Email ${idx + 1} (ID: ${email.id}):
          From: ${email.from}
          Subject: ${email.subject}
          Body Preview: ${email.bodyPreview}...
          `
            )
            .join('\n')}

          For each email, determine if it contains:
          - Job listings or job opportunities
          - Career advice or job alerts
          - Recruitment emails
          - Professional opportunities

          Return a JSON array with this exact structure:
          [
            {
              "id": "email_id",
              "isJobRelated": true/false,
              "confidence": 0.0-1.0
            }
          ]

          Use high confidence (>0.8) only for clear job opportunities.
          Use medium confidence (0.5-0.8) for career-related but not direct job posts.
          Use low confidence (<0.5) for non-job emails.
        `;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert at classifying emails for job content. Return only valid JSON array.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
        });

        const content = response.choices[0].message.content || '[]';
        // Clean up any markdown code blocks that might wrap the JSON
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```/g, '')
          .trim();
        const batchResults = JSON.parse(cleanContent);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < emails.length) {
          await this.delay(500);
        }
      }

      return results;
    } catch (error) {
      console.error('Error classifying emails:', error);
      return emails.map(email => ({ id: email.id, isJobRelated: false, confidence: 0 }));
    }
  }

  async extractJobsFromEmail(
    emailContent: string,
    emailSubject: string,
    emailFrom: string
  ): Promise<JobListing[]> {
    try {
      const prompt = `
        Extract job listings from this email content. This email is from a job platform like LinkedIn, JobStreet, etc.

        Email From: ${emailFrom}
        Email Subject: ${emailSubject}
        Email Content:
        ${emailContent}

        Please return a JSON array of job listings with this structure:
        [
          {
            "title": "Job Title",
            "company": "Company Name",
            "location": "Location",
            "isRemote": true/false,
            "description": "Job description",
            "requirements": ["requirement1", "requirement2"],
            "applyUrl": "https://...",
            "salary": "Salary range (if mentioned)",
            "postedDate": "YYYY-MM-DD",
            "source": "platform name (linkedin, jobstreet, etc)"
          }
        ]

        Rules:
        - Extract ALL job listings from the email
        - If location mentions "remote", "work from home", "WFH", set isRemote to true
        - Extract apply URLs carefully:
          * For LinkedIn: Look for URLs containing "/jobs/view/" or "linkedin.com/jobs" - NOT company pages
          * Prefer direct job application URLs over company profile URLs
          * If you find tracking URLs, try to extract the actual job URL from them
          * Avoid URLs that go to company pages or profiles
        - If salary not mentioned, set as null
        - Determine source from email sender
        - If job details are incomplete, extract what you can
        - Return empty array if no jobs found
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at extracting structured job data from emails. Return only valid JSON array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      });

      const content = response.choices[0].message.content || '[]';
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```/g, '')
        .trim();
      const jobs = JSON.parse(cleanContent);

      return jobs.map((job: any) => {
        const cleanedApplyUrl = this.cleanApplyUrl(job.applyUrl || '', emailFrom);
        const jobId = this.generateJobId(
          job.title || 'Unknown Title',
          job.company || 'Unknown Company',
          cleanedApplyUrl
        );
        
        return {
          id: jobId,
          title: job.title || 'Unknown Title',
          company: job.company || 'Unknown Company',
          location: job.location || 'Unknown Location',
          isRemote: job.isRemote || false,
          description: job.description || '',
          requirements: job.requirements || [],
          applyUrl: cleanedApplyUrl,
          salary: job.salary,
          postedDate: this.parseValidDate(job.postedDate),
          source: job.source || this.determineSource(emailFrom),
          relevanceScore: 0, // Will be calculated separately
          emailMessageId: '', // Will be set by caller
          processed: false,
          createdAt: new Date(),
        };
      });
    } catch (error) {
      console.error('Error extracting jobs from email:', error);
      return [];
    }
  }

  /**
   * Generate deterministic job ID based on job characteristics to prevent duplicates
   */
  private generateJobId(title: string, company: string, applyUrl: string): string {
    // Normalize inputs for consistent hashing
    const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedCompany = company.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedUrl = this.normalizeUrl(applyUrl);
    
    // Primary key: URL (if available) since it's most unique
    if (normalizedUrl && normalizedUrl !== 'unknown url') {
      const urlHash = crypto.createHash('sha256').update(normalizedUrl).digest('hex').substring(0, 16);
      return `job_url_${urlHash}`;
    }
    
    // Secondary key: title + company combination
    const combinedKey = `${normalizedTitle}|${normalizedCompany}`;
    const combinedHash = crypto.createHash('sha256').update(combinedKey).digest('hex').substring(0, 16);
    return `job_tc_${combinedHash}`;
  }

  /**
   * Normalize URLs for consistent comparison
   */
  private normalizeUrl(url: string): string {
    if (!url || url.toLowerCase() === 'unknown url') {
      return '';
    }
    
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and fragments
      const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      return cleanUrl.toLowerCase();
    } catch {
      // If URL parsing fails, use the original cleaned string
      return url.toLowerCase().trim();
    }
  }

  private async fetchJobUrlContent(url: string): Promise<string> {
    try {
      // Set a reasonable timeout and user agent
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Basic HTML text extraction - remove scripts, styles, and HTML tags
      let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Limit content size to avoid token limits (keep first 3000 characters)
      if (text.length > 3000) {
        text = text.substring(0, 3000) + '...';
      }

      // Filter out common non-job-content
      const lines = text.split('\n').filter(line => {
        const cleanLine = line.trim().toLowerCase();
        return (
          cleanLine.length > 10 &&
          !cleanLine.includes('cookie') &&
          !cleanLine.includes('privacy policy') &&
          !cleanLine.includes('terms of service') &&
          !cleanLine.includes('©') &&
          !cleanLine.includes('copyright')
        );
      });

      return lines.join('\n').trim();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw new Error(`Failed to fetch URL: ${error.message}`);
      }
      throw new Error('Unknown error fetching URL');
    }
  }

  async calculateJobRelevance(job: JobListing, resumeAnalysis: ResumeAnalysis): Promise<number> {
    try {
      // Try to fetch additional content from the job URL first
      let urlContent = '';
      let contentSource = 'email';

      if (job.applyUrl && job.applyUrl !== 'Unknown URL') {
        try {
          console.log(`Fetching content from job URL: ${job.applyUrl}`);
          urlContent = await this.fetchJobUrlContent(job.applyUrl);
          if (urlContent.trim()) {
            contentSource = 'url + email';
            console.log(`✅ Successfully fetched URL content (${urlContent.length} chars)`);
          }
        } catch (error) {
          console.log(
            `⚠️ Failed to fetch URL content, using email data: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      const jobDescription = urlContent.trim()
        ? `${job.description}\n\nAdditional details from job posting:\n${urlContent}`
        : job.description;

      const prompt = `
        Calculate how relevant this job is for this candidate based on their resume analysis.

        Job Details (source: ${contentSource}):
        - Title: ${job.title}
        - Company: ${job.company}
        - Location: ${job.location}
        - Remote: ${job.isRemote}
        - Description: ${jobDescription}
        - Requirements: ${job.requirements.join(', ')}

        Candidate Profile:
        - Skills: ${resumeAnalysis.skills.join(', ')}
        - Experience: ${resumeAnalysis.experience.join(', ')}
        - Preferred Roles: ${resumeAnalysis.preferredRoles.join(', ')}
        - Seniority: ${resumeAnalysis.seniority}

        Return a relevance score between 0.0 and 1.0 where:
        - 1.0 = Perfect match (exact skills, role, seniority)
        - 0.8-0.9 = Excellent match (most skills align)
        - 0.6-0.7 = Good match (some skills align)
        - 0.4-0.5 = Fair match (limited alignment)
        - 0.0-0.3 = Poor match (little to no alignment)

        Consider:
        - Technical skill overlap (React, JavaScript, frontend technologies)
        - Job title alignment with preferred roles
        - Seniority level appropriateness
        - Remote work preference (candidate focuses on React frontend, likely prefers remote)
        - Additional requirements and details from the full job posting

        Return only the numeric score (e.g., 0.85)
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert job matching system. Return only a numeric relevance score.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      });

      const scoreText = response.choices[0].message.content?.trim() || '0';
      const score = parseFloat(scoreText);

      return Math.max(0, Math.min(1, isNaN(score) ? 0 : score));
    } catch (error) {
      console.error('Error calculating job relevance:', error);
      return 0;
    }
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  private determineSource(emailFrom: string): string {
    if (emailFrom.includes('linkedin')) return 'LinkedIn';
    if (emailFrom.includes('jobstreet')) return 'JobStreet';
    if (emailFrom.includes('indeed')) return 'Indeed';
    if (emailFrom.includes('glassdoor')) return 'Glassdoor';
    return 'Unknown';
  }

  private cleanApplyUrl(url: string, emailFrom: string): string {
    if (!url || url.trim() === '') return '';

    try {
      // Clean up common URL issues
      let cleanUrl = url.trim();

      // Handle LinkedIn URLs specifically
      if (emailFrom.includes('linkedin') || cleanUrl.includes('linkedin.com')) {
        // If it's a company page URL instead of job URL, warn about it
        if (cleanUrl.includes('/company/') && !cleanUrl.includes('/jobs/')) {
          console.warn(`LinkedIn company URL detected instead of job URL: ${cleanUrl}`);
          // Return it anyway but log for monitoring
          return cleanUrl;
        }

        // If it's a valid LinkedIn job URL, clean tracking parameters
        if (cleanUrl.includes('/jobs/view/') || cleanUrl.includes('linkedin.com/jobs')) {
          // Remove common tracking parameters
          cleanUrl = cleanUrl.split('?')[0]; // Remove query parameters that are usually tracking
          return cleanUrl;
        }
      }

      // Handle Indeed URLs
      if (emailFrom.includes('indeed') || cleanUrl.includes('indeed.com')) {
        // Indeed URLs often have tracking - keep the core URL
        if (cleanUrl.includes('/viewjob?jk=')) {
          return cleanUrl.split('&')[0]; // Keep only the job key parameter
        }
      }

      // Generic URL validation
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        return cleanUrl;
      }

      // If URL doesn't start with protocol, assume https
      if (cleanUrl.includes('.com') || cleanUrl.includes('.org')) {
        return `https://${cleanUrl}`;
      }

      return cleanUrl;
    } catch (error) {
      console.warn(`Error cleaning URL "${url}":`, error);
      return url; // Return original if cleaning fails
    }
  }

  private parseValidDate(dateInput: any): Date {
    if (!dateInput) return new Date();

    const date = new Date(dateInput);

    // Check if the date is invalid (NaN)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date input: ${dateInput}, using current date`);
      return new Date();
    }

    return date;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
