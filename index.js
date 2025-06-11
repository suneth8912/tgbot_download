// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv not available, using environment variables directly');
}

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const ytdl = require('ytdl-core');
const axios = require('axios');

// Replace with your bot token from BotFather
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// Validate bot token before creating bot instance
if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ Bot token is not configured!');
  console.error('💡 Please follow these steps:');
  console.error('1. Message @BotFather on Telegram');
  console.error('2. Create a new bot with /newbot');
  console.error('3. Copy the bot token');
  console.error('4. Create a .env file with: BOT_TOKEN=your_token_here');
  console.error('5. Or set the BOT_TOKEN environment variable');
  process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Create downloads directory
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
fs.ensureDirSync(DOWNLOADS_DIR);

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🎬 *Video Downloader Bot*

Welcome! I can help you download videos from various platforms.

*How to use:*
1. Send me a video link (YouTube, Twitter, etc.)
2. I'll download and send it back to you

*Commands:*
/help - Show this help message
/start - Start the bot

*Supported platforms:*
• YouTube
• Twitter
• Direct video links

Just send me a link and I'll handle the rest! 🚀
  `;
  
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `
🆘 *Help & Instructions*

*How to download videos:*
1. Copy a video link from YouTube, Twitter, or any direct video URL
2. Send the link to me
3. Wait for the download to complete
4. I'll send you the video file

*Supported formats:*
• YouTube videos (up to 50MB)
• Twitter videos
• Direct MP4/AVI/MOV links

*Tips:*
• For best results, use shorter videos
• Large files may take longer to process
• Some platforms may have restrictions

*Example links:*
\`https://www.youtube.com/watch?v=dQw4w9WgXcQ\`
\`https://twitter.com/user/status/123456789\`

Need more help? Just ask! 😊
  `;
  
  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Handle video links
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Skip if it's a command
  if (messageText && messageText.startsWith('/')) {
    return;
  }

  // Check if message contains a URL
  if (!messageText || !isValidUrl(messageText)) {
    bot.sendMessage(chatId, '❌ Please send a valid video URL.\n\nUse /help for more information.');
    return;
  }

  try {
    // Send initial processing message
    const processingMsg = await bot.sendMessage(chatId, '🔄 Processing your request...');

    // Determine the platform and download
    if (isYouTubeUrl(messageText)) {
      await downloadYouTubeVideo(chatId, messageText, processingMsg.message_id);
    } else if (isTwitterUrl(messageText)) {
      await bot.editMessageText('❌ Twitter video downloads are currently not supported. Please try a YouTube link or direct video URL.', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
    } else {
      await downloadDirectVideo(chatId, messageText, processingMsg.message_id);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    bot.sendMessage(chatId, '❌ Something went wrong. Please try again later.');
  }
});

// YouTube video download
async function downloadYouTubeVideo(chatId, url, processingMsgId) {
  try {
    // Update status
    await bot.editMessageText('📺 Downloading YouTube video...', {
      chat_id: chatId,
      message_id: processingMsgId
    });

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      await bot.editMessageText('❌ Invalid YouTube URL. Please check the link and try again.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      return;
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename characters
    const filename = `${title}.mp4`;
    const filepath = path.join(DOWNLOADS_DIR, filename);

    // Check video duration (limit to 10 minutes for file size)
    const duration = parseInt(info.videoDetails.lengthSeconds);
    if (duration > 600) {
      await bot.editMessageText('❌ Video is too long (max 10 minutes). Please try a shorter video.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      return;
    }

    // Download video
    const video = ytdl(url, { 
      quality: 'highestvideo',
      filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
    });

    const writeStream = fs.createWriteStream(filepath);
    video.pipe(writeStream);

    video.on('progress', (chunkLength, downloaded, total) => {
      const percent = (downloaded / total * 100).toFixed(1);
      // Update progress every 25%
      if (percent % 25 < 1) {
        bot.editMessageText(`📺 Downloading YouTube video... ${percent}%`, {
          chat_id: chatId,
          message_id: processingMsgId
        }).catch(() => {}); // Ignore edit errors
      }
    });

    writeStream.on('finish', async () => {
      try {
        // Check file size (Telegram limit is 50MB)
        const stats = await fs.stat(filepath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        if (fileSizeInMB > 50) {
          await bot.editMessageText('❌ Video file is too large (>50MB). Please try a shorter video.', {
            chat_id: chatId,
            message_id: processingMsgId
          });
          await fs.remove(filepath);
          return;
        }

        // Update status
        await bot.editMessageText('📤 Uploading video...', {
          chat_id: chatId,
          message_id: processingMsgId
        });

        // Send video
        await bot.sendVideo(chatId, filepath, {
          caption: `🎬 *${info.videoDetails.title}*\n\n🔗 [Original Link](${url})`,
          parse_mode: 'Markdown'
        });

        // Delete processing message
        await bot.deleteMessage(chatId, processingMsgId);

        // Clean up file
        await fs.remove(filepath);

      } catch (error) {
        console.error('Error sending video:', error);
        await bot.editMessageText('❌ Failed to send video. The file might be too large or corrupted.', {
          chat_id: chatId,
          message_id: processingMsgId
        });
        await fs.remove(filepath).catch(() => {});
      }
    });

    writeStream.on('error', async (error) => {
      console.error('Download error:', error);
      await bot.editMessageText('❌ Failed to download video. Please try again.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      await fs.remove(filepath).catch(() => {});
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    await bot.editMessageText('❌ Failed to download YouTube video. Please check the link and try again.', {
      chat_id: chatId,
      message_id: processingMsgId
    });
  }
}

// Direct video download
async function downloadDirectVideo(chatId, url, processingMsgId) {
  try {
    await bot.editMessageText('🔄 Downloading video from direct link...', {
      chat_id: chatId,
      message_id: processingMsgId
    });

    // Get video info
    const response = await axios.head(url);
    const contentType = response.headers['content-type'];
    const contentLength = parseInt(response.headers['content-length'] || '0');

    // Check if it's a video
    if (!contentType || !contentType.startsWith('video/')) {
      await bot.editMessageText('❌ The provided link does not appear to be a video file.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      return;
    }

    // Check file size (50MB limit)
    const fileSizeInMB = contentLength / (1024 * 1024);
    if (fileSizeInMB > 50) {
      await bot.editMessageText('❌ Video file is too large (>50MB). Please try a smaller video.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      return;
    }

    // Generate filename
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];
    if (!filename.includes('.')) {
      filename = `video_${Date.now()}.mp4`;
    }
    const filepath = path.join(DOWNLOADS_DIR, filename);

    // Download video
    const videoResponse = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writeStream = fs.createWriteStream(filepath);
    videoResponse.data.pipe(writeStream);

    writeStream.on('finish', async () => {
      try {
        await bot.editMessageText('📤 Uploading video...', {
          chat_id: chatId,
          message_id: processingMsgId
        });

        // Send video
        await bot.sendVideo(chatId, filepath, {
          caption: `🎬 *Downloaded Video*\n\n🔗 [Original Link](${url})`,
          parse_mode: 'Markdown'
        });

        // Delete processing message
        await bot.deleteMessage(chatId, processingMsgId);

        // Clean up file
        await fs.remove(filepath);

      } catch (error) {
        console.error('Error sending video:', error);
        await bot.editMessageText('❌ Failed to send video. Please try again.', {
          chat_id: chatId,
          message_id: processingMsgId
        });
        await fs.remove(filepath).catch(() => {});
      }
    });

    writeStream.on('error', async (error) => {
      console.error('Download error:', error);
      await bot.editMessageText('❌ Failed to download video. Please try again.', {
        chat_id: chatId,
        message_id: processingMsgId
      });
      await fs.remove(filepath).catch(() => {});
    });

  } catch (error) {
    console.error('Direct video download error:', error);
    await bot.editMessageText('❌ Failed to download video from the provided link.', {
      chat_id: chatId,
      message_id: processingMsgId
    });
  }
}

// Utility functions
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function isTwitterUrl(url) {
  return url.includes('twitter.com') || url.includes('x.com');
}

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
  
  // Handle specific 404 errors (invalid bot token)
  if (error.message.includes('404 Not Found')) {
    console.error('❌ Invalid bot token! Please check your BOT_TOKEN configuration.');
    console.error('💡 Get a valid token from @BotFather on Telegram');
    process.exit(1);
  }
});

// Startup message
console.log('🤖 Telegram Video Downloader Bot is starting...');

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.log('❌ Please set your BOT_TOKEN environment variable or replace it in the code.');
  console.log('💡 Get your bot token from @BotFather on Telegram');
} else {
  console.log('✅ Bot is running! Send video links to download.');
}