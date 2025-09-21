'use client';

export const dynamic = 'force-dynamic';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Mail,
  Brain,
  Shield,
  Clock,
  Target,
  Globe,
  Users,
  CheckCircle,
  MessageCircle
} from 'lucide-react';

export default function Index() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect authenticated users to dashboard
    if (status === 'authenticated') {
      router.push('/jobs');
    }
  }, [status, router]);

  // Show loading for authenticated users being redirected
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  // Render comprehensive homepage for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Digest Bot</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">AI-Powered Job Alert Curation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/privacy" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                Privacy Policy
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Stop Missing Great Job Opportunities
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Job Digest Bot automatically processes your email job alerts, uses AI to filter relevant opportunities,
              and delivers personalized job matches directly to your Telegram. Never waste time on irrelevant job posts again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-3">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How Job Digest Bot Works</h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our AI-powered system automates your entire job search workflow, from email processing to intelligent matching.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-blue-100 dark:bg-blue-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">1. Connect Gmail</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Securely connect your Gmail account using OAuth2. We only read job-related emails.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-green-100 dark:bg-green-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">2. AI Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  OpenAI analyzes your resume and classifies job emails, extracting relevant opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-purple-100 dark:bg-purple-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg">3. Smart Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Jobs are scored based on your skills, experience, and preferences with relevance ratings.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto bg-orange-100 dark:bg-orange-900 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-lg">4. Telegram Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Get relevant jobs (≥60% match) delivered instantly to your Telegram with apply links.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features</h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Everything you need to streamline your job search process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                <CardTitle>Email Deduplication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Automatic detection and removal of duplicate job postings across different sources.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-6 w-6 text-blue-600 mb-2" />
                <CardTitle>Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  We only access job-related emails. Your personal data is encrypted and never shared.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-6 w-6 text-purple-600 mb-2" />
                <CardTitle>Real-time Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Hourly email checks (6 AM - 8 PM) ensure you never miss time-sensitive opportunities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-6 w-6 text-red-600 mb-2" />
                <CardTitle>Smart Relevance Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  AI analyzes job requirements against your resume to provide accuracy relevance scores.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-6 w-6 text-indigo-600 mb-2" />
                <CardTitle>Job Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Track application progress through customizable kanban stages with notes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-6 w-6 text-green-600 mb-2" />
                <CardTitle>Multi-Platform Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Works with LinkedIn, JobStreet, Indeed, and other major job platforms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Usage */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Data Usage & Transparency</h3>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              We believe in complete transparency about how your data is used.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <h4 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">What Data We Access & Why</h4>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Mail className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">Gmail Email Content</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Purpose:</strong> To identify and extract job-related emails and opportunities.
                    <br />
                    <strong>Scope:</strong> Only emails from job platforms (LinkedIn, JobStreet, etc.) from the last 3 days.
                    <br />
                    <strong>Processing:</strong> AI classification to filter job content and extract structured job data.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Users className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">Google Account Information</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Purpose:</strong> User authentication and personalization.
                    <br />
                    <strong>Data:</strong> Email address, name, and profile picture.
                    <br />
                    <strong>Usage:</strong> Account management and personalized job recommendations.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <Brain className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">Resume Analysis</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Purpose:</strong> To match jobs with your skills and experience.
                    <br />
                    <strong>Process:</strong> AI extracts skills, experience level, and preferred roles.
                    <br />
                    <strong>Retention:</strong> Analysis is cached for 7 days for efficiency.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <MessageCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white">Telegram Delivery</h5>
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong>Purpose:</strong> To send you relevant job notifications.
                    <br />
                    <strong>Frequency:</strong> Only jobs with ≥60% relevance score.
                    <br />
                    <strong>Content:</strong> Job title, company, location, relevance score, and apply link.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h6 className="font-semibold text-blue-900 dark:text-blue-100">Security Commitment</h6>
                  <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">
                    We never store your email passwords, sell your data, or share information with third parties.
                    All data is encrypted in transit and at rest. You can delete your account and data at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 dark:bg-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Job Search?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who have streamlined their job search with AI-powered automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Get Started Free
              </Button>
            </Link>
            <Link href="/privacy">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3 text-white border-white hover:bg-white hover:text-blue-600">
                <Shield className="mr-2 h-5 w-5" />
                Privacy Policy
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">Job Digest Bot</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered job alert curation that saves you time and helps you find better opportunities.
              </p>
              <div className="flex space-x-4">
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  Verified Domain
                </Badge>
                <Badge variant="outline" className="text-gray-400 border-gray-600">
                  GDPR Compliant
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/login" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><a href="mailto:support@jobdigestbot.com" className="hover:text-white">Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><a href="mailto:privacy@jobdigestbot.com" className="hover:text-white">Data Requests</a></li>
                <li><span className="text-xs">Google Cloud Verified</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} Job Digest Bot. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm mt-4 md:mt-0">
              Built with ❤️ for job seekers worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}