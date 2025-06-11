# Telegram Video Downloader Bot

A Telegram bot that downloads videos from various platforms including YouTube and direct video links.

## Features

- 🎬 Download videos from YouTube
- 📱 Support for direct video links
- 📤 Automatic file upload to Telegram
- 🔄 Real-time download progress
- 📏 File size validation (50MB limit)
- ⏱️ Duration limits for optimal performance
- 🛡️ Error handling and user feedback

## Setup

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the instructions
3. Copy the bot token you receive

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Bot

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your bot token:

```
BOT_TOKEN=your_actual_bot_token_here
```

Alternatively, you can directly replace `YOUR_BOT_TOKEN_HERE` in `index.js`.

### 4. Run the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Usage

1. Start a chat with your bot on Telegram
2. Send `/start` to see the welcome message
3. Send any supported video URL
4. Wait for the bot to download and send the video

### Supported Platforms

- **YouTube**: Full support with progress tracking
- **Direct Video Links**: MP4, AVI, MOV files
- **Twitter**: Coming soon

### Commands

- `/start` - Show welcome message
- `/help` - Show detailed help and instructions

## File Size Limits

- Maximum file size: 50MB (Telegram limitation)
- Maximum YouTube video duration: 10 minutes
- The bot will notify you if a video exceeds these limits

## Development

### Project Structure

```
telegram-video-bot/
├── index.js          # Main bot logic
├── package.json      # Dependencies and scripts
├── downloads/        # Temporary download directory
├── .env.example      # Environment variables template
└── README.md         # This file
```

### Adding New Platforms

To add support for new video platforms:

1. Add a detection function (e.g., `isInstagramUrl()`)
2. Create a download function (e.g., `downloadInstagramVideo()`)
3. Add the platform to the main message handler
4. Update the help text and README

## Error Handling

The bot includes comprehensive error handling for:

- Invalid URLs
- Network failures
- File size limits
- Download failures
- Upload failures

## Security Notes

- Keep your bot token secure and never commit it to version control
- The bot creates temporary files that are automatically cleaned up
- Consider implementing rate limiting for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify as needed.