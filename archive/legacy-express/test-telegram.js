const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN || 'your-bot-token';
const chatId = process.env.TELEGRAM_CHAT_ID || 'your-chat-id';

const bot = new TelegramBot(token, { polling: false });

async function testBot() {
  try {
    console.log('🔍 Testing bot info...');
    const me = await bot.getMe();
    console.log(`✅ Bot info: @${me.username} (${me.first_name})`);
    
    console.log('📤 Sending test message...');
    await bot.sendMessage(chatId, '🧪 Test message from job bot!');
    console.log('✅ Message sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('chat not found')) {
      console.log('\n💡 Solution: Send /start to your bot first!');
      console.log(`Bot username: @${me?.username || 'unknown'}`);
    }
  }
}

testBot();