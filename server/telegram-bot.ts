import TelegramBot from 'node-telegram-bot-api';

// Store user's active jobs
const userJobs = new Map<number, string>();
// Store status check intervals
const statusCheckers = new Map<string, NodeJS.Timer>();
// Store progress animation intervals
const progressAnimations = new Map<string, { 
  interval: NodeJS.Timer;
  currentProgress: number;
  lastMessage?: number;
}>();

// Initialize bot with token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

const bot = new TelegramBot(token, {
  polling: true,
  webHook: false,
  testEnvironment: false,
  interval: 300,
  onlyFirstMatch: true,
});

// Base URL for the API
const API_BASE_URL = 'http://provider.gpufarm.xyz:30507';

// Generate progress bar
function generateProgressBar(percentage: number): string {
  const length = 20;
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

// Start smooth progress animation
function startProgressAnimation(jobId: string, chatId: number, initialProgress: number) {
  // Clear existing animation if any
  if (progressAnimations.has(jobId)) {
    clearInterval(progressAnimations.get(jobId)?.interval);
  }

  const animation = {
    interval: setInterval(() => {
      const progress = progressAnimations.get(jobId);
      if (!progress) return;
      progress.currentProgress = Math.min(99, progress.currentProgress + 1);
    }, 3000), // Update every 3 seconds
    currentProgress: initialProgress,
    lastMessage: Date.now()
  };

  progressAnimations.set(jobId, animation);
}

// Stop and cleanup progress animation
function stopProgressAnimation(jobId: string) {
  const animation = progressAnimations.get(jobId);
  if (animation) {
    clearInterval(animation.interval);
    progressAnimations.delete(jobId);
  }
}

// Function to check job status
async function checkJobStatus(jobId: string, chatId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`);
    }
    const job = await response.json();

    // Get current progress from animation if exists
    const currentProgress = progressAnimations.get(jobId)?.currentProgress || 0;

    switch (job.status) {
      case 'queued':
        if (job.queue_position !== undefined) {
          const estimatedMinutes = job.queue_position * 8;
          await bot.sendMessage(
            chatId,
            `🎬 Generation Status: In Queue\n\n` +
            `${generateProgressBar(currentProgress)} ${currentProgress}%\n\n` +
            `📍 Queue Position: ${job.queue_position}\n` +
            `⏱ Estimated wait: ${estimatedMinutes} minutes`
          );
        }
        break;

      case 'processing':
        await bot.sendMessage(
          chatId,
          `🎬 Generation Status: Processing\n\n` +
          `${generateProgressBar(currentProgress)} ${currentProgress}%\n\n` +
          `⏱ Please wait while your video is being generated...`
        );
        break;

      case 'completed':
        // Stop progress animation and show 100%
        stopProgressAnimation(jobId);

        const videoUrl = `${API_BASE_URL}/api/jobs/${jobId}/video`;

        await bot.sendMessage(
          chatId,
          `🎬 Generation Status: Completed!\n\n` +
          `${generateProgressBar(100)} 100%\n\n` +
          `🎥 Video URL: ${videoUrl}\n\nSending the video file now...`
        );

        try {
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.status}`);
          }

          const buffer = await videoResponse.arrayBuffer();
          await bot.sendVideo(chatId, Buffer.from(buffer), {
            caption: 'Here is your generated video!'
          });
        } catch (error) {
          console.error('Error sending video:', error);
          await bot.sendMessage(
            chatId,
            `❌ Error sending video file.\n\nYou can download your video using this link:\n${videoUrl}`
          );
        } finally {
          // Cleanup
          clearInterval(statusCheckers.get(jobId));
          statusCheckers.delete(jobId);
          userJobs.delete(chatId);
        }
        break;

      case 'failed':
        stopProgressAnimation(jobId);
        await bot.sendMessage(
          chatId,
          `❌ Generation Status: Failed\n\n${generateProgressBar(0)} 0%\n\nPlease try again.`
        );
        // Cleanup
        clearInterval(statusCheckers.get(jobId));
        statusCheckers.delete(jobId);
        userJobs.delete(chatId);
        break;
    }
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    'Welcome to Wan2.1 Video Generation Bot!\n\n' +
    'Commands:\n' +
    '/generate <prompt> - Generate a video with your prompt\n' +
    '/status - Check your video generation progress'
  );
});

// Handle /generate command
bot.onText(/\/generate(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match?.[1]?.trim();

  if (!prompt) {
    bot.sendMessage(chatId, 'Please provide a prompt after /generate command.\nExample: /generate a beautiful sunset');
    return;
  }

  try {
    await bot.sendMessage(chatId, '🎬 Submitting your video generation request...');

    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        size: '832*480',
        sample_steps: 50,
        guide_scale: 6.0,
        use_prompt_extend: true,
        prompt_extend_target_lang: 'en'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit job: ${response.status}`);
    }

    const result = await response.json();
    const jobId = result.job_id;
    userJobs.set(chatId, jobId);

    // Start progress animation from 5%
    startProgressAnimation(jobId, chatId, 5);

    // Set up automatic status checking every 3 minutes
    const interval = setInterval(() => checkJobStatus(jobId, chatId), 180000);
    statusCheckers.set(jobId, interval);

    await bot.sendMessage(
      chatId,
      `✅ Video generation started!\n\n` +
      `${generateProgressBar(5)} 5%\n\n` +
      `I will send you updates every 3 minutes.\n` +
      `You can also use /status to check progress anytime.`
    );
  } catch (error) {
    console.error('Error submitting job:', error);
    await bot.sendMessage(chatId, '❌ Error submitting video generation request. Please try again later.');
  }
});

// Handle /status command
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const jobId = userJobs.get(chatId);

  if (!jobId) {
    bot.sendMessage(chatId, 'You don\'t have any active video generation jobs.\nUse /generate <prompt> to start one.');
    return;
  }

  await checkJobStatus(jobId, chatId);
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Telegram bot polling error:', error);
});

// Cleanup on process exit
process.on('SIGINT', () => {
  // Clear all intervals
  for (const interval of statusCheckers.values()) {
    clearInterval(interval);
  }
  for (const animation of progressAnimations.values()) {
    clearInterval(animation.interval);
  }
  bot.stopPolling();
  process.exit(0);
});

export default bot;