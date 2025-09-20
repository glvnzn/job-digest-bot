export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-gray max-w-none">
        <p className="text-lg mb-6">
          <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="mb-4">
            Job Digest Bot collects and processes the following information:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email content from your Gmail account (job-related emails only)</li>
            <li>Google account information (email address, name, profile picture)</li>
            <li>Job application tracking data you provide</li>
            <li>Usage analytics and system logs</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="mb-4">
            We use your information to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Process and analyze job-related emails</li>
            <li>Provide personalized job recommendations</li>
            <li>Send relevant job alerts via Telegram</li>
            <li>Improve our AI algorithms and services</li>
            <li>Provide customer support</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or share your personal information with third parties except:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>When required by law or legal process</li>
            <li>To protect our rights, property, or safety</li>
            <li>With service providers who help operate our platform (OpenAI, Google, Telegram)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure database storage with access controls</li>
            <li>Regular security audits and updates</li>
            <li>Limited access to personal data on a need-to-know basis</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and associated data</li>
            <li>Opt-out of email processing</li>
            <li>Download your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
          <p className="mb-4">
            Our application integrates with:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Google Gmail API:</strong> To access and process your emails</li>
            <li><strong>OpenAI API:</strong> To analyze job content and provide insights</li>
            <li><strong>Telegram Bot API:</strong> To send you job notifications</li>
          </ul>
          <p className="mb-4">
            Please review the privacy policies of these services for their data handling practices.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
          <p className="mb-4">
            We retain your data for as long as necessary to provide our services. You may request
            data deletion at any time by contacting us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mb-4">
            Email: privacy@jobdigestbot.com
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new Privacy Policy on this page and updating the effective date.
          </p>
        </section>
      </div>
    </div>
  );
}