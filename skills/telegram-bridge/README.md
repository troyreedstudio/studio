# Telegram Bridge

Bridges `@pinkalbinobot` on Telegram to Claude Code CLI running in `~/studio`. Messages you send to the bot are passed to `claude --print` with full studio context, and the response is sent back to Telegram.

## Prerequisites

- Node.js 18+
- PM2 (`npm install -g pm2`)
- Claude Code CLI (`claude`) on your PATH
- `TELEGRAM_BOT_TOKEN_PINK` and `TELEGRAM_ALLOWED_USER_IDS` set in `~/studio/.env`

## Setup

```bash
cd ~/studio/skills/telegram-bridge
npm install
```

## Start

```bash
# Foreground (for testing)
npm start

# Background with PM2 (persistent)
npm run pm2:start
```

## Stop / Restart

```bash
npm run pm2:stop
npm run pm2:restart
```

## Logs

```bash
npm run pm2:logs

# Or directly
pm2 logs telegram-bridge
```

## How It Works

1. Bot polls Telegram for messages via long-polling
2. Checks sender's user ID against `TELEGRAM_ALLOWED_USER_IDS` — rejects strangers silently
3. Spawns `claude --print --dangerously-skip-permissions "<message>"` in `~/studio/`
4. Since the working directory is `~/studio/`, Claude Code automatically loads `CLAUDE.md` for full studio context
5. Collects the full response and sends it back to Telegram
6. Long responses (>4096 chars) are split at paragraph/line boundaries into multiple messages
7. Sends typing indicator while Claude is working (up to 5 minute timeout)

## Commands

- **Any text** — passed to Claude Code
- **/start** — confirms the bridge is online
- **/cancel** — kills a running Claude process

## Notes

- Only works while your MacBook is awake (sleep is disabled via `pmset`)
- One message at a time per chat — send `/cancel` to abort a stuck request
- The bridge runs `claude` from `~/studio/` so it picks up `CLAUDE.md`, skills, and project context automatically
- PM2 will auto-restart the bridge if it crashes (max 10 restarts with 5s delay)

## PM2 Startup (survive reboots)

```bash
pm2 startup
# Run the command it outputs, then:
pm2 save
```
