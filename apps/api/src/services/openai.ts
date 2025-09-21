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
        - For company names, be intelligent about "Private Advertiser":
          * If you see "Private Advertiser" in JobStreet content, try to find the actual company name elsewhere
          * Look for company names in the job description, email content, or job URLs
          * Check for patterns like "Company: [Name]", "at [Company Name]", "[Company] is hiring"
          * Only use "Private Advertiser" as a last resort when no real company name is found
          * If you find a real company name, use that instead of "Private Advertiser"
        - For remote work detection, be AGGRESSIVE and set isRemote to true if ANY of these appear ANYWHERE in the job posting:
          * Location: "remote", "work from home", "WFH", "work-from-home", "telecommute", "telework"
          * Description: "remote work", "remote position", "remote opportunity", "fully remote", "100% remote"
          * Description: "work remotely", "work from anywhere", "distributed team", "remote-first"
          * Description: "no office required", "location independent", "virtual team", "remote collaboration"
          * Benefits: mentions remote work as a benefit or perk
          * BUT: If it mentions "hybrid", "office required", "on-site", or "in-person", set isRemote to false
        - Extract apply URLs carefully:
          * For LinkedIn: Look for URLs containing "/jobs/view/" or "linkedin.com/jobs" - NOT company pages
          * For JobStreet: Look for URLs containing "jobstreet.com" with complete query parameters
          * For Indeed: Look for URLs with "/viewjob?jk=" parameter
          * Prefer direct job application URLs over company profile URLs
          * If you find tracking URLs, try to extract the actual job URL from them
          * Avoid URLs that go to company pages or profiles
          * Ensure URLs are complete and not truncated - include all query parameters
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

      // Process jobs asynchronously to enable URL content fetching and summary generation
      return await Promise.all(
        jobs.map(async (job: any) => {
          const cleanedApplyUrl = this.cleanApplyUrl(job.applyUrl || '', emailFrom);
          
          // Validate the cleaned URL
          if (cleanedApplyUrl && !this.validateJobUrl(cleanedApplyUrl)) {
            console.warn(`Skipping job with invalid URL: ${job.title} at ${job.company} - URL: ${cleanedApplyUrl}`);
            // Still process the job but mark URL as invalid
          }
          
          // Enhanced company name extraction for Private Advertiser cases
          const enhancedCompanyName = this.enhanceCompanyName(
            job.company || 'Unknown Company',
            job.title || '',
            job.description || '',
            emailContent,
            cleanedApplyUrl,
            emailFrom
          );
          
          const jobId = this.generateJobId(
            job.title || 'Unknown Title',
            enhancedCompanyName,
            cleanedApplyUrl
          );
          
          // Enhanced remote detection - post-process to catch what AI might have missed
          const enhancedIsRemote = this.detectRemoteWork(
            job.title || '',
            job.description || '',
            job.location || '',
            job.requirements || [],
            job.isRemote || false
          );
          
          // Enhanced job description with URL content and AI summary
          let enhancedDescription = job.description || '';
          let extractionStatus = 'pending';
          let extractionError: string | null = null;
          let contentExtracted = false;

          try {
            if (cleanedApplyUrl && this.validateJobUrl(cleanedApplyUrl)) {
              console.log(`🔍 Enhancing job description for: ${job.title} at ${enhancedCompanyName}`);
              extractionStatus = 'attempting';

              // Small delay to be respectful to job sites (2 seconds between requests)
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Fetch full job content from URL
              const urlContent = await this.fetchJobUrlContent(cleanedApplyUrl);

              if (urlContent && urlContent.length > 100) { // Only proceed if we got substantial content
                // Generate AI-powered structured summary
                const aiSummary = await this.generateJobSummary(
                  job.title || 'Unknown Title',
                  enhancedCompanyName,
                  job.description || '',
                  urlContent
                );

                if (aiSummary && aiSummary.length > enhancedDescription.length) {
                  enhancedDescription = aiSummary;
                  extractionStatus = 'success';
                  contentExtracted = true;
                  console.log(`✅ Enhanced description with AI summary (${aiSummary.length} chars)`);
                } else {
                  // Fallback: use the raw URL content if AI summary fails
                  enhancedDescription = `${job.description || ''}\n\n## Additional Details from Job Posting\n\n${urlContent}`;
                  extractionStatus = 'partial';
                  contentExtracted = true;
                  extractionError = 'AI summary failed, using raw content';
                  console.log(`⚠️ Using raw URL content as fallback (${enhancedDescription.length} chars)`);
                }
              } else {
                extractionStatus = 'failed';
                extractionError = 'Insufficient content from URL (less than 100 characters)';
                console.log(`⚠️ Insufficient URL content for ${job.title}, using original description`);
              }
            } else {
              extractionStatus = 'skipped';
              extractionError = !cleanedApplyUrl ? 'No valid URL provided' : 'URL validation failed';
              console.log(`⚠️ Skipping content extraction for ${job.title}: ${extractionError}`);
            }
          } catch (error) {
            extractionStatus = 'failed';
            extractionError = error instanceof Error ? error.message : 'Unknown error during extraction';
            console.error(`❌ Failed to enhance job description for ${job.title}:`, error);
          }
          
          return {
            id: jobId,
            title: job.title || 'Unknown Title',
            company: enhancedCompanyName,
            location: job.location || 'Unknown Location',
            isRemote: enhancedIsRemote,
            description: enhancedDescription,
            requirements: job.requirements || [],
            applyUrl: cleanedApplyUrl,
            salary: job.salary,
            postedDate: this.parseValidDate(job.postedDate),
            source: job.source || this.determineSource(emailFrom),
            relevanceScore: 0, // Will be calculated separately
            emailMessageId: '', // Will be set by caller
            processed: false,
            contentExtracted,
            extractionStatus,
            extractionError,
            extractionAttempts: 1,
            lastExtractionAt: new Date(),
            createdAt: new Date(),
          };
        })
      );
    } catch (error) {
      console.error('Error extracting jobs from email:', error);
      return [];
    }
  }

  /**
   * Enhanced remote work detection - more aggressive than AI alone
   */
  private detectRemoteWork(
    title: string, 
    description: string, 
    location: string, 
    requirements: string[], 
    aiDetectedRemote: boolean
  ): boolean {
    // Combine all text for analysis
    const allText = [
      title,
      description,
      location,
      ...(Array.isArray(requirements) ? requirements : [])
    ].join(' ').toLowerCase();

    // EXCLUSION patterns - if these exist, it's NOT remote
    const hybridPatterns = [
      'hybrid',
      'hybrid work',
      'hybrid model',
      'hybrid arrangement',
      'office required',
      'on-site required',
      'onsite required',
      'in-person required',
      'must be located',
      'must be based',
      'local candidates only',
      'relocation required',
      'office presence',
      'days in office',
      'office days',
      'partially remote',
      'some remote work',
      'flexible work arrangement',
      'mix of remote and office',
      'combination of remote',
      '3 days in office',
      '2 days in office',
      '1 day in office',
      'occasional office visits',
      'periodic office attendance'
    ];

    // Check if it's hybrid/on-site (not fully remote)
    const hasHybridPattern = hybridPatterns.some(pattern => 
      allText.includes(pattern)
    );

    if (hasHybridPattern) {
      console.log(`Job marked as non-remote due to hybrid/on-site requirement: ${title}`);
      return false;
    }

    // INCLUSION patterns - aggressive remote detection
    const remotePatterns = [
      // Location-based
      'remote',
      'work from home',
      'wfh',
      'work-from-home',
      'telecommute',
      'telework',
      'home-based',
      
      // Work arrangement
      'fully remote',
      '100% remote',
      'completely remote',
      'remote position',
      'remote role',
      'remote job',
      'remote work',
      'remote opportunity',
      'remote team',
      'distributed team',
      'virtual team',
      'remote-first',
      'remote friendly',
      
      // Flexibility indicators
      'work from anywhere',
      'location independent',
      'no office required',
      'virtual collaboration',
      'digital nomad',
      'anywhere in',
      
      // Common remote job titles
      'virtual assistant',
      'online tutor',
      'remote developer',
      'remote engineer',
      'remote designer',
      'remote writer',
      'remote manager',
      'remote consultant',
      'virtual instructor',
      'online instructor',
      'remote analyst',
      'remote specialist',
      'remote coordinator',
      'virtual support',
      'online support',
      
      // Benefits/perks mentioning remote
      'remote work benefit',
      'work from home benefit',
      'flexible location'
    ];

    // Check for remote patterns
    const hasRemotePattern = remotePatterns.some(pattern => 
      allText.includes(pattern)
    );

    // Special location-based detection
    const locationPatterns = [
      'worldwide',
      'global',
      'anywhere',
      'any location',
      'usa remote',
      'us remote',
      'remote usa',
      'remote us',
      'philippines remote',
      'remote philippines',
      'remote - worldwide',
      'remote - global',
      'remote (worldwide)',
      'remote (global)',
      'international remote',
      'remote international',
      'asia remote',
      'remote asia',
      'europe remote',
      'remote europe',
      'north america remote',
      'remote north america',
      'remote - any location',
      'remote location',
      'home office',
      'virtual office'
    ];

    const hasRemoteLocation = locationPatterns.some(pattern => 
      location.toLowerCase().includes(pattern)
    );

    const finalRemote = aiDetectedRemote || hasRemotePattern || hasRemoteLocation;

    if (finalRemote && !aiDetectedRemote) {
      console.log(`Enhanced remote detection found remote job: ${title} - Pattern detected in: "${allText.slice(0, 200)}..."`);
    }

    return finalRemote;
  }

  /**
   * Enhanced company name extraction for Private Advertiser cases
   */
  private enhanceCompanyName(
    originalCompany: string,
    jobTitle: string,
    jobDescription: string,
    emailContent: string,
    _applyUrl: string,
    _emailFrom: string
  ): string {
    // If it's not Private Advertiser, return as-is
    if (originalCompany !== 'Private Advertiser') {
      return originalCompany;
    }

    console.log(`🔍 Attempting to find real company name for job: ${jobTitle}`);

    // Try to extract company name from various sources
    const allText = [jobTitle, jobDescription, emailContent].join(' ');
    
    // Common patterns for company names in job content
    const companyPatterns = [
      // Company: [Name] patterns
      /Company:\s*([A-Za-z][\w\s&.,'-]+?)(?:\s*\||\s*-|\s*\n|$)/i,
      // "at [Company]" patterns
      /\bat\s+([A-Z][\w\s&.,'-]+?)(?:\s+is\s+|,|\.|!|\s*\n)/,
      // "[Company] is hiring" patterns
      /([A-Z][\w\s&.,'-]+?)\s+is\s+(?:hiring|looking|seeking)/i,
      // "Join [Company]" patterns
      /Join\s+([A-Z][\w\s&.,'-]+?)(?:\s+as|\s+team|,|\.|!)/i,
      // Email subject patterns like "Job at [Company]"
      /Job\s+at\s+([A-Z][\w\s&.,'-]+)/i,
      // Working at [Company]
      /working\s+at\s+([A-Z][\w\s&.,'-]+)/i
    ];

    // Dynamic pattern for company name followed by job title
    if (jobTitle) {
      const escapedJobTitle = jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dynamicPattern = new RegExp(`([A-Z][\\w\\s&.,'-]+?)\\s*-\\s*${escapedJobTitle}`, 'i');
      companyPatterns.push(dynamicPattern);
    }

    for (const pattern of companyPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        const companyName = match[1].trim();
        
        // Basic validation of company name
        if (this.isValidCompanyName(companyName)) {
          console.log(`✅ Found company name: "${companyName}" for job: ${jobTitle}`);
          return companyName;
        }
      }
    }

    // Try to extract company from URL (last resort for JobStreet)
    // JobStreet URLs are complex and don't typically contain company names
    // This could be enhanced in the future if needed

    // If we couldn't find a real company name, stick with Private Advertiser
    console.log(`⚠️ Could not find real company name for job: ${jobTitle}, keeping "Private Advertiser"`);
    return originalCompany;
  }

  /**
   * Validate if a potential company name looks legitimate
   */
  private isValidCompanyName(companyName: string): boolean {
    if (!companyName || companyName.length < 2) {
      return false;
    }

    // Filter out common false positives
    const invalidPatterns = [
      /^(the|a|an|this|that|you|your|our|we|they|it)$/i,
      /^(job|position|role|opportunity|career|work)$/i,
      /^(private|advertiser|company|employer|organization)$/i,
      /^(hiring|recruiting|seeking|looking)$/i,
      /^(full|part|time|remote|onsite|hybrid)$/i,
      /^\d+$/, // Only numbers
      /^.{1,2}$/, // Too short (1-2 chars)
      /^.{50,}$/, // Too long (50+ chars)
    ];

    // Check if it matches any invalid pattern
    if (invalidPatterns.some(pattern => pattern.test(companyName))) {
      return false;
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(companyName)) {
      return false;
    }

    // Must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(companyName)) {
      return false;
    }

    return true;
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
      console.log(`🔍 Fetching job content from: ${url}`);
      
      // Set a reasonable timeout and user agent
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for better content fetching

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`✅ Successfully fetched HTML (${html.length} chars)`);

      // Enhanced HTML text extraction with better content preservation
      let text = html
        // Remove scripts and styles
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
        // Convert common HTML elements to readable text
        .replace(/<h[1-6][^>]*>/gi, '\n## ')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/li>/gi, '')
        .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
        .replace(/<div[^>]*>/gi, ' ')
        .replace(/<\/div>/gi, ' ')
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        // Remove remaining HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Clean up entities and formatting
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#[0-9]+;/g, ' ')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        // Clean up whitespace
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

      // Increase content size limit for better job descriptions (8000 characters)
      if (text.length > 8000) {
        // Try to cut at a sentence boundary
        const truncated = text.substring(0, 8000);
        const lastSentence = truncated.lastIndexOf('.');
        if (lastSentence > 6000) { // If we can find a sentence boundary after 6000 chars
          text = truncated.substring(0, lastSentence + 1) + '\n\n[Content truncated for processing]';
        } else {
          text = truncated + '\n\n[Content truncated for processing]';
        }
      }

      // Enhanced filtering to remove noise while preserving job content
      const lines = text.split('\n').filter(line => {
        const cleanLine = line.trim().toLowerCase();
        
        // Keep lines that are substantial and job-related
        if (cleanLine.length < 5) return false;
        
        // Filter out common non-job content
        const excludePatterns = [
          'cookie', 'privacy policy', 'terms of service', 'terms & conditions',
          '©', 'copyright', 'all rights reserved',
          'sign in', 'log in', 'create account', 'register',
          'follow us', 'social media', 'newsletter',
          'advertisement', 'sponsored', 'promoted',
          'back to top', 'scroll to top', 'go to top',
          'menu', 'navigation', 'breadcrumb',
          'search jobs', 'browse jobs', 'job alerts',
          'powered by', 'website by', 'developed by'
        ];
        
        const hasExcludedContent = excludePatterns.some(pattern => 
          cleanLine.includes(pattern)
        );
        
        if (hasExcludedContent) return false;
        
        // Keep lines that likely contain job information
        const jobKeywords = [
          'requirement', 'responsibility', 'qualification', 'skill', 'experience',
          'benefit', 'salary', 'compensation', 'remote', 'hybrid',
          'bachelor', 'degree', 'year', 'proficient', 'knowledge',
          'role', 'position', 'team', 'company', 'join', 'opportunity',
          'work', 'develop', 'manage', 'lead', 'support', 'collaborate',
          'php', 'javascript', 'react', 'node', 'python', 'java', 'sql',
          'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum'
        ];
        
        const hasJobKeywords = jobKeywords.some(keyword => 
          cleanLine.includes(keyword)
        );
        
        // Keep if it has job keywords or if it's substantial content (likely job description)
        return hasJobKeywords || cleanLine.length > 20;
      });

      const filteredText = lines.join('\n').trim();
      console.log(`🔍 Extracted content: ${filteredText.length} characters after filtering`);
      
      return filteredText;
    } catch (error) {
      console.error('❌ Error fetching job URL content:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw new Error(`Failed to fetch URL: ${error.message}`);
      }
      throw new Error('Unknown error fetching URL');
    }
  }

  /**
   * Generate a structured, easy-to-digest summary of a job posting using AI
   */
  private async generateJobSummary(
    jobTitle: string,
    company: string,
    originalDescription: string,
    urlContent: string
  ): Promise<string> {
    try {
      console.log(`🤖 Generating AI summary for: ${jobTitle} at ${company}`);

      // Combine all available content for analysis
      const allContent = `
Original Job Info:
Title: ${jobTitle}
Company: ${company}
Description: ${originalDescription}

Full Job Posting Content:
${urlContent}
      `.trim();

      const prompt = `
Analyze this job posting and create a well-structured, easy-to-digest summary. 
Focus on extracting the most important information that a job seeker would want to know quickly.

Job Content:
${allContent}

Please return a structured summary in this exact markdown format:

## 📋 Job Overview
[2-3 sentence summary of the role and what the company does]

## 🎯 Key Requirements
• [Most important requirement 1]
• [Most important requirement 2]
• [Most important requirement 3]
• [Additional requirements if applicable, max 6 total]

## 💼 Responsibilities
• [Main responsibility 1]
• [Main responsibility 2]
• [Main responsibility 3]
• [Additional responsibilities if applicable, max 6 total]

## 🌟 Benefits & Perks
• [Benefit 1]
• [Benefit 2]
• [Additional benefits if mentioned]

## 📍 Work Arrangement
[Remote/Hybrid/On-site details, location, schedule info]

## 💰 Compensation
[Salary range if mentioned, or "Not specified"]

## 🏢 About the Company
[Brief company overview if available, or "Company information not provided"]

Guidelines:
- Keep each bullet point concise (1-2 lines max)
- Focus on the most important/unique aspects
- Use clear, professional language
- If information isn't available for a section, write "Not specified" or "Information not provided"
- Prioritize technical requirements, experience level, and unique benefits
- Include specific technologies, frameworks, or tools mentioned
- Make it scannable and easy to read quickly
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing job postings and creating clear, structured summaries that help job seekers quickly understand if a position is right for them. Return only the formatted markdown summary.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const summary = response.choices[0].message.content?.trim() || '';
      
      if (summary.length > 0) {
        console.log(`✅ Generated summary: ${summary.length} characters`);
        return summary;
      } else {
        console.warn('⚠️ AI returned empty summary, using fallback');
        return this.createFallbackSummary(jobTitle, company, originalDescription, urlContent);
      }
    } catch (error) {
      console.error('❌ Error generating job summary:', error);
      // Fallback to a basic structured format
      return this.createFallbackSummary(jobTitle, company, originalDescription, urlContent);
    }
  }

  /**
   * Create a fallback summary when AI generation fails
   */
  private createFallbackSummary(
    jobTitle: string,
    company: string,
    originalDescription: string,
    urlContent: string
  ): string {
    const content = urlContent || originalDescription;
    
    return `## 📋 Job Overview
${jobTitle} position at ${company}.

## 📄 Full Description
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

*This is a fallback summary. Full job details are available above.*`;
  }

  async calculateJobRelevance(job: JobListing, resumeAnalysis: ResumeAnalysis): Promise<number> {
    try {
      // Job description now contains enhanced content with AI summary from URL
      // No need to fetch URL content again since it's done during job extraction
      console.log(`🎯 Calculating relevance for: ${job.title} at ${job.company}`);
      
      const contentSource = job.description.includes('## 📋 Job Overview') 
        ? 'enhanced with AI summary' 
        : 'original description';
        
      const jobDescription = job.description;

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
      
      // Log URL processing for debugging
      console.log(`Processing URL: ${cleanUrl} from ${emailFrom}`);

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
          console.log(`Returning LinkedIn URL: ${cleanUrl}`);
          return cleanUrl;
        }
      }

      // Handle Indeed URLs
      if (emailFrom.includes('indeed') || cleanUrl.includes('indeed.com')) {
        // Indeed URLs often have tracking - keep the core URL
        if (cleanUrl.includes('/viewjob?jk=')) {
          const finalUrl = cleanUrl.split('&')[0]; // Keep only the job key parameter
          console.log(`Returning Indeed URL: ${finalUrl}`);
          return finalUrl;
        }
      }

      // Handle JobStreet URLs
      if (emailFrom.includes('jobstreet') || cleanUrl.includes('jobstreet.com')) {
        // JobStreet URLs often require query parameters to work correctly
        // Keep all parameters but remove tracking ones if needed
        if (cleanUrl.includes('jobstreet.com')) {
          try {
            // Remove common tracking parameters but preserve essential ones
            const url = new URL(cleanUrl);
            // Remove tracking parameters that might break the link
            url.searchParams.delete('utm_source');
            url.searchParams.delete('utm_medium');
            url.searchParams.delete('utm_campaign');
            url.searchParams.delete('utm_content');
            url.searchParams.delete('fbclid');
            const finalUrl = url.toString();
            console.log(`Returning JobStreet URL: ${finalUrl}`);
            return finalUrl;
          } catch (error) {
            console.warn(`Error processing JobStreet URL "${cleanUrl}":`, error);
            // Return original URL if processing fails
            return cleanUrl;
          }
        }
      }

      // Generic URL validation
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        console.log(`Returning generic URL: ${cleanUrl}`);
        return cleanUrl;
      }

      // If URL doesn't start with protocol, assume https
      if (cleanUrl.includes('.com') || cleanUrl.includes('.org')) {
        const finalUrl = `https://${cleanUrl}`;
        console.log(`Returning URL with https prefix: ${finalUrl}`);
        return finalUrl;
      }

      console.log(`Returning fallback URL: ${cleanUrl}`);
      return cleanUrl;
    } catch (error) {
      console.warn(`Error cleaning URL "${url}":`, error);
      return url; // Return original if cleaning fails
    }
  }

  /**
   * Validate that a URL is accessible and properly formatted
   */
  private validateJobUrl(url: string): boolean {
    if (!url || url.trim() === '') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      
      // Must have http/https protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn(`Invalid protocol for URL: ${url}`);
        return false;
      }

      // Must have valid hostname
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        console.warn(`Invalid hostname for URL: ${url}`);
        return false;
      }

      // Check for common job site patterns
      const hostname = urlObj.hostname.toLowerCase();
      const validJobSites = [
        'linkedin.com',
        'jobstreet.com', 
        'indeed.com',
        'glassdoor.com',
        'monster.com',
        'kalibrr.com',
        'jobs.ph'
      ];

      const isKnownJobSite = validJobSites.some(site => 
        hostname.includes(site) || hostname.endsWith(site)
      );

      if (!isKnownJobSite) {
        console.log(`Unknown job site URL (might still be valid): ${url}`);
      }

      return true;
    } catch (error) {
      console.warn(`Invalid URL format: ${url}`, error);
      return false;
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
