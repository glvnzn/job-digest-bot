const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Gmail OAuth2 Token Generator Utility
 * 
 * This utility helps generate Gmail refresh tokens for the Job Digest Bot.
 * It consolidates the functionality of generating and exchanging authorization codes.
 */

// Gmail API scope for full Gmail access (needed for reading and archiving emails)
const SCOPES = ['https://mail.google.com/'];
const REDIRECT_URI = 'http://localhost:8080';

class GmailTokenGenerator {
  constructor(clientId, clientSecret) {
    this.clientId = clientId || process.env.GMAIL_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.GMAIL_CLIENT_SECRET;
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('❌ GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are required');
    }
    
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      REDIRECT_URI
    );
  }

  /**
   * Generate an authorization URL for OAuth2 flow
   */
  generateAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(authorizationCode) {
    try {
      const { tokens } = await this.oauth2Client.getToken(authorizationCode);
      
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. This can happen if you\'ve already authorized this app before. Try revoking app permissions in your Google Account settings and try again.');
      }
      
      return {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token
      };
    } catch (error) {
      if (error.message.includes('invalid_grant')) {
        throw new Error('The authorization code has expired or is invalid. Please get a new authorization code.');
      }
      throw error;
    }
  }

  /**
   * Interactive method to generate refresh token using local server
   */
  async generateInteractively() {
    console.log('🔐 Gmail Refresh Token Generator');
    console.log('================================\n');

    return new Promise((resolve, reject) => {
      // Create a local server to catch the OAuth callback
      const server = http.createServer(async (req, res) => {
        const queryParams = url.parse(req.url, true).query;
        
        if (queryParams.code) {
          // We got the authorization code
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2>✅ Authorization Successful!</h2>
                <p>You can close this window and return to the terminal.</p>
                <p>The Gmail token will be generated automatically.</p>
              </body>
            </html>
          `);
          
          server.close();
          
          try {
            const tokens = await this.exchangeCodeForTokens(queryParams.code);
            
            console.log('\n✅ Success! Here are your credentials:');
            console.log('=====================================');
            console.log(`GMAIL_CLIENT_ID=${tokens.clientId}`);
            console.log(`GMAIL_CLIENT_SECRET=${tokens.clientSecret}`);
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refreshToken}`);
            console.log('=====================================\n');
            
            console.log('📝 Add these to your .env file!');
            
            resolve(tokens);
          } catch (error) {
            console.error('❌ Error getting tokens:', error.message);
            reject(error);
          }
        } else if (queryParams.error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h2>❌ Authorization Failed</h2>
                <p>Error: ${queryParams.error}</p>
                <p>Please try again.</p>
              </body>
            </html>
          `);
          
          server.close();
          reject(new Error(`OAuth error: ${queryParams.error}`));
        }
      });

      server.listen(8080, 'localhost', () => {
        // Generate authorization URL
        const authUrl = this.generateAuthUrl();

        console.log('🌐 Starting local server on http://localhost:8080');
        console.log('\n📋 Step 1: Open this URL in your browser:');
        console.log(authUrl);
        console.log('\n📋 Step 2: Grant permissions in your browser');
        console.log('📋 Step 3: The token will be generated automatically after authorization\n');
        console.log('⏳ Waiting for authorization...');
      });

      // Handle server errors
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error('❌ Port 8080 is already in use. Please stop any other servers and try again.');
        } else {
          console.error('❌ Server error:', error.message);
        }
        reject(error);
      });
    });
  }

  /**
   * Non-interactive method to exchange a known authorization code
   */
  async exchangeCode(authorizationCode) {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');
      
      const tokens = await this.exchangeCodeForTokens(authorizationCode);
      
      console.log('\n✅ Success! Here are your Gmail credentials:');
      console.log('===============================================');
      console.log(`GMAIL_CLIENT_ID=${tokens.clientId}`);
      console.log(`GMAIL_CLIENT_SECRET=${tokens.clientSecret}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refreshToken}`);
      console.log('===============================================\n');
      
      console.log('📝 Copy these to your .env file!');
      
      return tokens;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// Export for use as a module
module.exports = { GmailTokenGenerator };

// CLI usage when run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Gmail Token Generator Utility

Usage:
  node gmail-token-generator.js                    # Interactive mode
  node gmail-token-generator.js <authorization-code>  # Direct exchange mode

Environment Variables:
  GMAIL_CLIENT_ID      Your Google OAuth2 client ID
  GMAIL_CLIENT_SECRET  Your Google OAuth2 client secret

Example:
  # Interactive mode
  GMAIL_CLIENT_ID=your-id GMAIL_CLIENT_SECRET=your-secret node gmail-token-generator.js
  
  # Direct exchange
  GMAIL_CLIENT_ID=your-id GMAIL_CLIENT_SECRET=your-secret node gmail-token-generator.js 4/1AVMBsJj...
`);
    process.exit(0);
  }

  // Initialize generator
  try {
    const generator = new GmailTokenGenerator();
    
    if (args.length > 0) {
      // Direct exchange mode
      const authCode = args[0];
      generator.exchangeCode(authCode).catch(error => {
        console.error('Failed to exchange code:', error.message);
        process.exit(1);
      });
    } else {
      // Interactive mode
      generator.generateInteractively().catch(error => {
        console.error('Failed to generate token:', error.message);
        process.exit(1);
      });
    }
  } catch (error) {
    console.error(error.message);
    console.log('\n💡 Make sure to set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET environment variables');
    console.log('💡 Get these from your Google Cloud Console OAuth2 credentials');
    process.exit(1);
  }
}