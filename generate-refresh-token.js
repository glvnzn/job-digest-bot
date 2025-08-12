const { google } = require('googleapis');
const readline = require('readline');

// Replace these with your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = '60946269692-h1uofvge93uqq7aher60brmfol0ja7bi.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Gmail API scope for reading and deleting emails
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

async function generateRefreshToken() {
  console.log('🔐 Gmail Refresh Token Generator');
  console.log('================================\n');

  if (CLIENT_ID === 'your_client_id_here' || CLIENT_SECRET === 'your_client_secret_here') {
    console.log('❌ Please update CLIENT_ID and CLIENT_SECRET in this script first!');
    console.log('Get them from your Google Cloud Console OAuth2 credentials JSON file.\n');
    return;
  }

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent screen to get refresh token
  });

  console.log('📋 Step 1: Open this URL in your browser:');
  console.log(authUrl);
  console.log('\n📋 Step 2: Grant permissions and copy the authorization code');
  console.log('📋 Step 3: Paste the code below and press Enter\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter authorization code: ', async (code) => {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      if (!tokens.refresh_token) {
        console.error('❌ No refresh token received. Make sure you approved the consent screen properly.');
        console.log('💡 Try the process again with a fresh authorization URL.');
      } else {
        console.log('\n✅ Success! Here are your credentials:');
        console.log('=====================================');
        console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('=====================================\n');
        
        console.log('📝 Add these to your .env file!');
      }
      
    } catch (error) {
      console.error('❌ Error getting tokens:', error.message);
      console.log('💡 Make sure the authorization code is correct and hasn\'t expired.');
    }
    
    rl.close();
  });
}

generateRefreshToken();