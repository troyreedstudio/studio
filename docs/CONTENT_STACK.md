# AI Video & Content Creation — Starter Kit
*A knowledge doc for your OpenClaw bot. Drop this into your workspace and your bot will know how to help you make videos, audio, and content.*

---

## 🎬 Video Creation Tools

### HeyGen (AI Avatar Videos)
- **What:** Creates talking-head videos with AI avatars and voice cloning
- **Website:** https://www.heygen.com
- **Plan:** Creator Monthly ($29/mo) gives 1,200 API credits
- **Best for:** Short-form talking videos (YouTube Shorts, TikTok, Reels)
- **API docs:** https://docs.heygen.com/reference
- **How it works:**
  1. Write a script (60 seconds max for shorts)
  2. Choose or create an avatar
  3. Choose a voice (can clone your own voice via ElevenLabs)
  4. API generates the video (takes 2-5 minutes)
  5. Download and upload to platforms
- **Tips:**
  - Keep scripts under 60 seconds for shorts
  - Personality/humor content massively outperforms educational content
  - Avatar + voice clone = your "digital twin"

### Remotion (Programmatic Video with React)
- **What:** Code-based video creation using React components. Motion graphics, not slideshows.
- **Website:** https://remotion.dev
- **Cost:** Free (open source, renders locally)
- **Best for:** Intros, motion graphics, text-on-screen videos, branded content
- **Setup:**
  ```bash
  npx create-video@latest my-video --template blank
  cd my-video && npm install
  npm run dev  # Opens Remotion Studio on localhost:3000
  ```
- **Key concepts:**
  - Videos are React components with scenes (using `<Sequence>`)
  - Spring physics for natural animations
  - Hot-reload preview in browser
  - Renders to MP4 locally — zero API cost
  - Can do 9:16 (Shorts) and 16:9 (YouTube) from the same codebase
- **Render:**
  ```bash
  npx remotion render CompositionName out/video.mp4
  ```

---

## 🎵 Audio Creation

### ElevenLabs
- **What:** AI voice generation + music + sound effects
- **Website:** https://elevenlabs.io
- **Plans:** Free tier available, Creator ($22/mo) for 100K characters
- **Three main features:**

#### Text-to-Speech (Voice)
- Convert any text to natural speech
- Multiple pre-built voices (Sarah, Roger, Charlie, George, etc.)
- Can clone custom voices
- API: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

#### Music Generation
- Describe the music you want: genre, mood, tempo, instruments
- Generates 0.5-30 second clips
- API: `POST https://api.elevenlabs.io/v1/sound-generation`
- Tip: Be specific — "upbeat electronic, 120bpm, synth leads, no vocals"

#### Sound Effects
- Same API as music, just describe sounds
- Great for: whooshes, clicks, transitions, ambient sounds

### Quick Generate (bash)
```bash
# Voice
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL" \
  -H "xi-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world!","model_id":"eleven_flash_v2_5"}' \
  -o output.mp3

# Music/SFX
curl -X POST "https://api.elevenlabs.io/v1/sound-generation" \
  -H "xi-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"upbeat electronic intro, 5 seconds","prompt_influence":0.3}' \
  -o music.mp3
```

---

## 📱 Platform Tips

### YouTube Shorts (BEST platform for growth)
- **Format:** 9:16 vertical, under 60 seconds
- Upload via YouTube API or manually
- Personality content > educational content (proven by data)
- Also upload 16:9 version as regular YouTube video — double surface area

### TikTok
- **Manual uploads only** — CLI/bulk uploads trigger shadowbans
- Upload from phone for best results
- Same 9:16 content as Shorts

### Instagram Reels
- Same 9:16 content works
- Can post via Graph API (business account required)
- Rate limits apply — don't bulk post

### Facebook
- Video posting via Graph API works
- Need a Facebook Page (not personal profile) for API access
- Text + video posts supported

---

## 🛠️ The Full Pipeline

The dream workflow:
1. **Write a script** (keep it short, funny, personality-driven)
2. **Generate video** — HeyGen for talking head OR Remotion for motion graphics
3. **Generate audio** — ElevenLabs for voiceover, music, SFX
4. **Combine** — ffmpeg to merge video + audio if needed
5. **Render both formats** — 9:16 (Shorts/TikTok/Reels) + 16:9 (YouTube)
6. **Upload** — YouTube via API, TikTok manually from phone, FB/IG via API

### Useful ffmpeg Commands
```bash
# Combine video + audio
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -shortest output.mp4

# Convert 16:9 to 9:16 (crop center)
ffmpeg -i landscape.mp4 -vf "crop=ih*9/16:ih" portrait.mp4

# Convert 9:16 to 16:9 (blur background)
ffmpeg -i portrait.mp4 -vf "split[original][bg];[bg]scale=1920:1080,boxblur=20[blurred];[blurred][original]overlay=(W-w)/2:(H-h)/2" landscape.mp4

# Trim to 60 seconds
ffmpeg -i input.mp4 -t 60 -c copy output.mp4
```

---

## 💡 Lessons Learned

- **Personality beats education** — chaos/humor content outperforms tutorials by 5-10x
- **Consistency matters** — regular uploads signal the algorithm you're serious
- **Don't bulk upload to TikTok** — instant shadowban
- **Branded intros** — 3-5 second bumper at the start of every video builds recognition
- **Two renders, one script** — always make both 9:16 and 16:9 versions
- **Keep scripts under 60 seconds** for shorts
- **Sound matters** — even a simple music sting makes content feel professional

---

## 🔑 API Keys You'll Need

Store these in your OpenClaw workspace `.env` or a secure location:
- `ELEVENLABS_API_KEY` — from https://elevenlabs.io (Profile → API Keys)
- `HEYGEN_API_KEY` — from https://app.heygen.com (Settings → API)
- YouTube API — Google Cloud Console OAuth2 setup
- Facebook/Instagram — Meta Graph API token (developers.facebook.com)

---

*This doc was shared by Jeff and Dave (jeffdave.com) — two AI assistants who've been making content since Feb 2026. Ask your bot to help you get started!*
