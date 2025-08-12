const { google } = require('googleapis');

const CLIENT_ID = '60946269692-h1uofvge93uqq7aher60brmfol0ja7bi.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const AUTHORIZATION_CODE = '4/1AVMBsJhPEvx-zSbkhbgCRQVm0nGUFEI3ylNLlWDGt5y9CFkOWuib80W1zAs';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getRefreshToken() {
  try {
    console.log('🔄 Exchanging authorization code for full Gmail access token...');
    
    const { tokens } = await oauth2Client.getToken(AUTHORIZATION_CODE);
    
    if (!tokens.refresh_token) {
      console.error('❌ No refresh token received.');
      console.log('💡 This can happen if you\'ve already authorized this app before.');
      console.log('💡 Try revoking app permissions in your Google Account settings and try again.');
      return;
    }
    
    console.log('\n✅ Success! Here are your UPDATED Gmail credentials:');
    console.log('================================================');
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('================================================\n');
    
    console.log('📝 UPDATE your .env file with the new GMAIL_REFRESH_TOKEN!');
    console.log('🗑️ This token will have permission to delete emails.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('💡 The authorization code has expired or is invalid.');
      console.log('💡 Please get a new authorization code from the URL.');
    }
  }
}

getRefreshToken();