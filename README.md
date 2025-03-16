# Wan2.1 Video Generation Telegram Bot

A Telegram bot interface for the Wan2.1 video generation platform, leveraging GPU farm technology for AI-powered video creation.

## Features

- 🎬 Generate videos from text prompts
- 📊 Real-time progress tracking with visual indicators
- 🔄 Automatic status updates every 2 minutes
- 📱 Direct video delivery through Telegram
- 🎯 Queue position tracking with estimated wait times

## Technical Stack

- Node.js
- Express.js
- node-telegram-bot-api
- React (Web Interface)
- TypeScript

## Environment Variables

The following environment variables are required:

- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot token

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Start the server:
   ```bash
   npm run dev
   ```

## Usage

1. Start a chat with the bot
2. Send a text prompt describing the video you want to generate
3. The bot will provide real-time updates on your video generation progress
4. Use `/status` command to manually check progress
5. Once complete, the bot will send both the video file and a download URL

## API Integration

The bot integrates with the Wan2.1 GPU Farm API (provider.gpufarm.xyz:30507) for video generation.

## License

MIT
