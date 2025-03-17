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

// Validate video URL format and accessibility
async function validateVideoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 5000
    });

    if (!response.ok) {
      console.error(`Invalid video URL response: ${response.status} ${response.statusText}`);
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('video')) {
      console.error(`Invalid content type: ${contentType}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating video URL:', error);
    return false;
  }
}

// Generate progress bar
function generateProgressBar(percentage: number): string {
  const length = 20;
  const filled = Math.floor((percentage / 100) * length);
  const empty = length - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

// Calculate base progress percentage based on status
function getBaseProgressPercentage(status: string, queuePosition: number | undefined, startTime?: number): number {
  switch (status) {
    case 'queued':
      return queuePosition ? Math.max(5, 20 - (queuePosition * 2)) : 5;
    case 'processing':
      if (!startTime) return 25;
      const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
      return Math.min(90, 25 + (elapsed / 10) * 65); // Max 90% until complete
    case 'completed':
      return 100;
    default:
      return 0;
  }
}

// Start smooth progress animation
function startProgressAnimation(jobId: string, chatId: number, initialProgress: number) {
  // Clear existing animation if any
  if (progressAnimations.has(jobId)) {
    clearInterval(progressAnimations.get(jobId)?.interval);
  }

  const animation = {
    interval: setInterval(async () => {
      const progress = progressAnimations.get(jobId);
      if (!progress) return;

      // Increment progress by 1%
      progress.currentProgress = Math.min(99, progress.currentProgress + 1);

      // Only send update every 5% to avoid spam
      if (!progress.lastMessage || Date.now() - progress.lastMessage >= 5000) {
        const progressBar = generateProgressBar(progress.currentProgress);
        await bot.sendMessage(
          chatId,
          `🎬 Generation Status: Processing\n\n` +
          `${progressBar} ${progress.currentProgress}%\n\n` +
          `⏱ Please wait while your video is being generated...`
        );
        progress.lastMessage = Date.now();
      }
    }, 1000), // Update every second
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

// Function to check job status
async function checkJobStatus(jobId: string, chatId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`);
    }
    const job = await response.json();

    switch (job.status) {
      case 'queued':
        if (job.queue_position !== undefined) {
          const estimatedMinutes = job.queue_position * 8;
          const progress = getBaseProgressPercentage('queued', job.queue_position);
          const progressBar = generateProgressBar(progress);

          await bot.sendMessage(
            chatId,
            `🎬 Generation Status: In Queue\n\n` +
            `${progressBar} ${progress}%\n\n` +
            `📍 Queue Position: ${job.queue_position}\n` +
            `⏱ Estimated wait: ${estimatedMinutes} minutes`
          );

          // Start progress animation from queue position
          startProgressAnimation(jobId, chatId, progress);
        }
        break;

      case 'processing':
        const progress = getBaseProgressPercentage('processing', undefined, job.started_at ? new Date(job.started_at).getTime() : undefined);
        // Update animation with new base progress
        const animation = progressAnimations.get(jobId);
        if (animation) {
          animation.currentProgress = Math.max(animation.currentProgress, progress);
        } else {
          startProgressAnimation(jobId, chatId, progress);
        }
        break;

      case 'completed':
        // Stop animation and show 100%
        stopProgressAnimation(jobId);

        const videoUrl = `${API_BASE_URL}/api/jobs/${jobId}/video`;
        console.log('Video URL:', videoUrl);

        // Show 100% completion
        await bot.sendMessage(
          chatId,
          `🎬 Generation Status: Completed!\n\n` +
          `${generateProgressBar(100)} 100%\n\n` +
          `🎥 Video URL: ${videoUrl}\n\nSending the video file now...`
        );

        // Validate and send video
        const isVideoValid = await validateVideoUrl(videoUrl);
        if (!isVideoValid) {
          await bot.sendMessage(
            chatId,
            `❌ Error: Video is not ready yet. Please try again in a few moments.\n\nYou can try downloading directly from:\n${videoUrl}`
          );
          return;
        }

        try {
          console.log('Fetching video from:', videoUrl);
          const videoResponse = await fetch(videoUrl, {
            timeout: 30000
          });

          if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
          }

          const contentType = videoResponse.headers.get('content-type');
          const contentLength = videoResponse.headers.get('content-length');
          console.log(`Video response received - Type: ${contentType}, Size: ${contentLength} bytes`);

          if (!contentType?.includes('video')) {
            throw new Error(`Invalid content type: ${contentType}`);
          }

          console.log('Converting video response to buffer...');
          const buffer = await videoResponse.arrayBuffer();
          console.log(`Buffer size: ${buffer.byteLength} bytes`);

          console.log('Sending video to Telegram...');
          await bot.sendVideo(chatId, Buffer.from(buffer), {
            caption: 'Here is your generated video!',
            filename: `generated_video_${jobId}.mp4`
          });

          console.log('Video sent successfully!');
        } catch (videoError) {
          console.error('Error sending video:', videoError);
          await bot.sendMessage(
            chatId,
            `❌ Error sending video file.\n\nYou can download your video using this link:\n${videoUrl}\n\nError details: ${videoError.message}`
          );
        } finally {
          // Cleanup
          clearInterval(statusCheckers.get(jobId));
          statusCheckers.delete(jobId);
          userJobs.delete(chatId);
        }
        break;

      case 'failed':
        // Stop animation and show error
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
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      await bot.sendMessage(chatId, '❌ Error checking status. Please try again later.');
    }
  }
}

// Handle start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to Wan2.1 Video Generation Bot!\n\nSend me a text prompt to generate a video.\nUse /status to check your video generation progress.');
});

// Handle status command (manual check)
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const jobId = userJobs.get(chatId);

  if (!jobId) {
    bot.sendMessage(chatId, 'You don\'t have any active video generation jobs.');
    return;
  }

  await checkJobStatus(jobId, chatId);
});

// Handle text messages (prompts)
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return;

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

    // Set up automatic status checking every 2 minutes
    const interval = setInterval(() => checkJobStatus(jobId, chatId), 120000);
    statusCheckers.set(jobId, interval);

    // Start progress animation from 5%
    startProgressAnimation(jobId, chatId, 5);

    await bot.sendMessage(
      chatId,
      `✅ Video generation started!\n\n` +
      `${generateProgressBar(5)} 5%\n\n` +
      `I will send you progress updates.\n` +
      `You can also use /status to check progress anytime.`
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