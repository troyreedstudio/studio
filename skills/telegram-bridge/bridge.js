#!/usr/bin/env node

const path = require("path");
const { spawn } = require("child_process");
const TelegramBot = require("node-telegram-bot-api");

// Load .env from studio root
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const STUDIO_DIR = path.resolve(__dirname, "../..");
const CLAUDE_MD = path.join(STUDIO_DIR, "CLAUDE.md");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PINK;
const ALLOWED_IDS = (process.env.TELEGRAM_ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const TELEGRAM_MAX_LENGTH = 4096;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN_PINK is not set in .env");
  process.exit(1);
}

if (ALLOWED_IDS.length === 0) {
  console.error("TELEGRAM_ALLOWED_USER_IDS is not set in .env");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Track active claude processes per chat so we can avoid overlap
const activeSessions = new Map();

console.log(
  `[telegram-bridge] Online. Accepting messages from user IDs: ${ALLOWED_IDS.join(", ")}`
);

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const text = msg.text;

  // Ignore non-text messages
  if (!text) return;

  // Auth check
  if (!ALLOWED_IDS.includes(userId)) {
    console.log(`[telegram-bridge] Rejected message from user ${userId}`);
    return;
  }

  // Handle /start
  if (text === "/start") {
    await bot.sendMessage(
      chatId,
      "Studio bridge online. Send any message and I'll pass it to Claude Code."
    );
    return;
  }

  // Handle /cancel — kill running process
  if (text === "/cancel") {
    const session = activeSessions.get(chatId);
    if (session) {
      session.kill("SIGTERM");
      activeSessions.delete(chatId);
      await bot.sendMessage(chatId, "Cancelled.");
    } else {
      await bot.sendMessage(chatId, "Nothing running.");
    }
    return;
  }

  // Reject if already processing for this chat
  if (activeSessions.has(chatId)) {
    await bot.sendMessage(
      chatId,
      "Still working on your last message. Send /cancel to abort it."
    );
    return;
  }

  // Send typing indicator
  await bot.sendChatAction(chatId, "typing");

  try {
    const response = await runClaude(chatId, text);
    await sendLongMessage(chatId, response);
  } catch (err) {
    console.error("[telegram-bridge] Error:", err.message);
    await bot.sendMessage(chatId, `Error: ${err.message}`);
  }
});

/**
 * Spawn claude CLI with the user's message, collect full output.
 * Uses the existing OAuth login session (Claude Max subscription)
 * rather than an API key. The CLI reads auth from ~/.claude/.
 */
function runClaude(chatId, message) {
  return new Promise((resolve, reject) => {
    const args = [
      "--print", // non-interactive, print response and exit
      "--dangerously-skip-permissions", // no interactive permission prompts
      message,
    ];

    // Build a clean env that ensures the CLI uses OAuth (Claude Max)
    // instead of falling back to ANTHROPIC_API_KEY
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY; // force OAuth, not API key billing

    const proc = spawn("claude", args, {
      cwd: STUDIO_DIR,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 300000, // 5 minute timeout
    });

    activeSessions.set(chatId, proc);

    let stdout = "";
    let stderr = "";

    // Keep sending typing indicator while claude is working
    const typingInterval = setInterval(() => {
      bot.sendChatAction(chatId, "typing").catch(() => {});
    }, 4000);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      clearInterval(typingInterval);
      activeSessions.delete(chatId);

      if (code === 0 || stdout.length > 0) {
        resolve(stdout.trim() || "(empty response)");
      } else {
        reject(
          new Error(
            stderr.trim().slice(0, 500) || `claude exited with code ${code}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      clearInterval(typingInterval);
      activeSessions.delete(chatId);
      reject(err);
    });
  });
}

/**
 * Split long messages at Telegram's 4096 char limit.
 * Tries to split at newlines to preserve formatting.
 */
async function sendLongMessage(chatId, text) {
  const chunks = splitMessage(text, TELEGRAM_MAX_LENGTH);
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" }).catch(
      // If Markdown parsing fails, send as plain text
      () => bot.sendMessage(chatId, chunk)
    );
  }
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a double newline (paragraph break)
    let splitAt = remaining.lastIndexOf("\n\n", maxLen);
    // Fall back to single newline
    if (splitAt < maxLen * 0.3) {
      splitAt = remaining.lastIndexOf("\n", maxLen);
    }
    // Fall back to space
    if (splitAt < maxLen * 0.3) {
      splitAt = remaining.lastIndexOf(" ", maxLen);
    }
    // Last resort: hard cut
    if (splitAt < maxLen * 0.3) {
      splitAt = maxLen;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[telegram-bridge] Shutting down...");
  bot.stopPolling();
  for (const proc of activeSessions.values()) {
    proc.kill("SIGTERM");
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[telegram-bridge] Interrupted.");
  bot.stopPolling();
  process.exit(0);
});
