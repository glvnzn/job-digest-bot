import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import { ResumeAnalysis, JobListing } from '../models/types';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
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
            content: 'You are an expert at analyzing resumes. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        skills: analysis.skills || [],
        experience: analysis.experience || [],
        preferredRoles: analysis.preferredRoles || [],
        seniority: analysis.seniority || 'mid',
        analyzedAt: new Date()
      };
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  }

  async classifyEmailsBatch(emails: Array<{id: string, subject: string, from: string, body: string}>): Promise<Array<{id: string, isJobRelated: boolean, confidence: number}>> {
    try {
      // Process emails in smaller batches for efficiency
      const batchSize = 10;
      const results: Array<{id: string, isJobRelated: boolean, confidence: number}> = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const emailSummaries = batch.map(email => ({
          id: email.id,
          from: email.from,
          subject: email.subject,
          bodyPreview: email.body.substring(0, 500) // First 500 chars for efficiency
        }));

        const prompt = `
          Analyze these emails and determine which ones contain job opportunities or career-related content:

          ${emailSummaries.map((email, idx) => `
          Email ${idx + 1} (ID: ${email.id}):
          From: ${email.from}
          Subject: ${email.subject}
          Body Preview: ${email.bodyPreview}...
          `).join('\n')}

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
              content: 'You are an expert at classifying emails for job content. Return only valid JSON array.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1
        });

        const content = response.choices[0].message.content || '[]';
        // Clean up any markdown code blocks that might wrap the JSON
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
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

  async extractJobsFromEmail(emailContent: string, emailSubject: string, emailFrom: string): Promise<JobListing[]> {
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
        - Extract apply URLs carefully
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
            content: 'You are an expert at extracting structured job data from emails. Return only valid JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      });

      const content = response.choices[0].message.content || '[]';
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const jobs = JSON.parse(cleanContent);
      
      return jobs.map((job: any, index: number) => ({
        id: `job_${Date.now()}_${index}`,
        title: job.title || 'Unknown Title',
        company: job.company || 'Unknown Company',
        location: job.location || 'Unknown Location',
        isRemote: job.isRemote || false,
        description: job.description || '',
        requirements: job.requirements || [],
        applyUrl: job.applyUrl || '',
        salary: job.salary,
        postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
        source: job.source || this.determineSource(emailFrom),
        relevanceScore: 0, // Will be calculated separately
        emailMessageId: '', // Will be set by caller
        processed: false,
        createdAt: new Date()
      }));
    } catch (error) {
      console.error('Error extracting jobs from email:', error);
      return [];
    }
  }

  async calculateJobRelevance(job: JobListing, resumeAnalysis: ResumeAnalysis): Promise<number> {
    try {
      const prompt = `
        Calculate how relevant this job is for this candidate based on their resume analysis.

        Job Details:
        - Title: ${job.title}
        - Company: ${job.company}
        - Location: ${job.location}
        - Remote: ${job.isRemote}
        - Description: ${job.description}
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

        Return only the numeric score (e.g., 0.85)
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert job matching system. Return only a numeric relevance score.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}