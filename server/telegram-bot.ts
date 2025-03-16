import TelegramBot from 'node-telegram-bot-api';

// Initialize bot with token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

const bot = new TelegramBot(token, { 
  polling: true,
  // Add configurations to handle polling better
  webHook: false, // Explicitly disable webhooks
  testEnvironment: false, // Not a test environment
  polling_interval: 300, // Poll every 300ms
  onlyFirstMatch: true, // Stop after first match
});

// Base URL for the API
const API_BASE_URL = 'http://provider.gpufarm.xyz:30507';

// Store user's active jobs
const userJobs = new Map<number, string>();

// Handle start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to Wan2.1 Video Generation Bot!\n\nSend me a text prompt to generate a video.\nUse /status to check your video generation progress.');
});

// Handle status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const jobId = userJobs.get(chatId);

  if (!jobId) {
    bot.sendMessage(chatId, 'You don\'t have any active video generation jobs.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
    const job = await response.json();

    let statusMessage = 'Video Generation Status:\n';
    switch (job.status) {
      case 'queued':
        statusMessage += `🕒 In Queue (Position: ${job.queue_position || 'unknown'})`;
        break;
      case 'processing':
        statusMessage += '🎬 Generating your video (this takes 6-10 minutes)...';
        break;
      case 'completed':
        statusMessage += '✅ Video generation completed! Sending video...';
        // Send the video
        await bot.sendVideo(chatId, `${API_BASE_URL}/api/jobs/${jobId}/video`);
        userJobs.delete(chatId);
        break;
      case 'failed':
        statusMessage += '❌ Video generation failed. Please try again.';
        userJobs.delete(chatId);
        break;
    }

    await bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    console.error('Error checking job status:', error);
    await bot.sendMessage(chatId, '❌ Error checking status. Please try again later.');
  }
});

// Handle text messages (prompts)
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Ignore commands

  const chatId = msg.chat.id;
  const prompt = msg.text;

  if (!prompt) return;

  try {
    await bot.sendMessage(chatId, '🎬 Submitting your video generation request...');

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        size: '832*480', // Default size
        sample_steps: 50,
        guide_scale: 6.0,
        use_prompt_extend: true,
        prompt_extend_target_lang: 'en'
      })
    });

    const result = await response.json();
    userJobs.set(chatId, result.job_id);

    await bot.sendMessage(
      chatId,
      '✅ Video generation started!\n\nUse /status to check the progress.\nThis usually takes 6-10 minutes.'
    );
  } catch (error) {
    console.error('Error submitting job:', error);
    await bot.sendMessage(
      chatId,
      '❌ Error submitting video generation request. Please try again later.'
    );
  }
});

// Handle polling errors
bot.on('polling_error', (error) => {
  // Log the error but don't crash
  console.error('Telegram bot polling error:', error);
});

// Cleanup on process exit
process.on('SIGINT', () => {
  bot.stopPolling();
  process.exit(0);
});

export default bot;