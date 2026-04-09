# Sascha's Setup Guide

Everything you need to get Claude Code running on your Mac with the studio repo and Telegram bridge. Should take about 30-45 minutes.

---

## Step 1: Install Claude Code

Open **Terminal** (press Cmd + Space, type "Terminal", hit Enter) and paste this:

```bash
curl -fsSL https://claude.ai/install.sh | sh
```

Close and reopen Terminal when it finishes.

Verify it worked:

```bash
claude --version
```

You should see a version number.

---

## Step 2: Log In to Claude

```bash
claude auth login
```

Choose **claude.ai** when prompted, then log in with your Claude account in the browser window that opens. This uses your Claude subscription — no API key needed.

---

## Step 3: Install GitHub CLI

```bash
brew install gh
```

If you don't have Homebrew, install it first:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then log in to GitHub:

```bash
gh auth login
```

Choose:
- **GitHub.com**
- **HTTPS**
- **Login with a web browser**

Log in with the **troyreedstudio** GitHub account.

---

## Step 4: Clone the Studio Repo

```bash
cd ~
gh repo clone troyreedstudio/studio
cd ~/studio
```

This downloads the entire studio — all projects, skills, docs, and your Frankie identity files.

---

## Step 5: Set Up Your .env

Copy the template:

```bash
cp .env.example .env
```

Open it in a text editor:

```bash
open -a TextEdit .env
```

Replace `YOUR_KEY_HERE` with real values for the keys you have. The ones you need:

| Variable | What it is | Where to find it |
|----------|-----------|-----------------|
| `ELEVENLABS_API_KEY` | Voice generation | elevenlabs.io → Profile → API Keys |
| `HEYGEN_API_KEY` | Avatar videos | app.heygen.com → Settings → API |
| `REMOVE_BG_API_KEY` | Background removal | remove.bg → Account → API Keys |
| `TELEGRAM_BOT_TOKEN` | Frankie's Telegram bot | Already filled in — don't change it |
| `TELEGRAM_ALLOWED_USER_IDS` | Your + Troy's Telegram IDs | Already filled in — don't change it |

The Pink Pineapple keys (MONGODB_URI, STRIPE, etc.) can stay as `YOUR_KEY_HERE` for now — Troy will handle those.

Save and close the file.

---

## Step 6: Install the Telegram Bridge

```bash
cd ~/studio/skills/telegram-bridge
npm install
```

Then install PM2 (keeps the bridge running in the background):

```bash
npm install -g pm2
```

---

## Step 7: Start the Bridge

```bash
cd ~/studio/skills/telegram-bridge
pm2 start ecosystem.config.js
```

Check it's running:

```bash
pm2 status
```

You should see `telegram-bridge` with status **online**.

Make it survive reboots:

```bash
pm2 startup
```

It will print a command — copy and paste that command back into Terminal. Then:

```bash
pm2 save
```

---

## Step 8: Test It

Open Telegram on your phone or iPad and send a message to **Frankie's bot** (the one linked to `TELEGRAM_BOT_TOKEN` in your .env).

Send:

> Hi Frankie, are you online?

You should get a response within 10-30 seconds. If it works, you're all set.

---

## Step 9: Stop Your Mac from Sleeping

So Frankie stays online when you're not at the keyboard:

```bash
sudo pmset -a sleep 0 disksleep 0
```

Enter your Mac password when asked. This keeps the Mac awake permanently.

To undo later:

```bash
sudo pmset -a sleep 1 disksleep 10
```

---

## Your Agent Identity

Your agent is **Frankie** (she/her, ⚡). Her personality and soul files are in the studio:

- `~/studio/docs/FRANKIE-SOUL.md` — who Frankie is, how she behaves
- `~/studio/docs/FRANKIE-IDENTITY.md` — name, pronouns, vibe, emoji

Claude Code reads `~/studio/CLAUDE.md` automatically every session, which has the full studio context — all projects, all history, everything Troy and the agents have built.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Start Claude Code | `cd ~/studio && claude` |
| Check bridge status | `pm2 status` |
| View bridge logs | `pm2 logs telegram-bridge` |
| Restart bridge | `pm2 restart telegram-bridge` |
| Stop bridge | `pm2 stop telegram-bridge` |

---

## If Something Goes Wrong

**"claude: command not found"** — Close and reopen Terminal, or run:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

**"npm: command not found"** — Install Node.js first:
```bash
brew install node
```

**Bridge keeps crashing** — Check the logs:
```bash
pm2 logs telegram-bridge --lines 20
```

**Telegram bot not responding** — Make sure the bot token in `.env` is correct and the bridge shows "online" in `pm2 status`.

Ask Troy if you get stuck. He can remote in and fix anything.
