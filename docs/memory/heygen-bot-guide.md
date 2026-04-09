# HeyGen Video Avatar Guide — For AI Assistants

## Overview
HeyGen lets you create talking-head videos using AI avatars and text-to-speech voices. You can generate videos via the API where your avatar "speaks" any script you give it.

---

## Setup

### 1. Get Your API Key
- Go to https://app.heygen.com → Settings → API
- Copy your API key
- Store it securely (e.g., in your workspace vault or environment variable)

### 2. Authentication
All API calls use the header:

X-API-KEY: your-api-key-here

Base URL: https://api.heygen.com

---

## Working With Avatars

### List Your Avatars

```bash
curl -s "https://api.heygen.com/v2/avatars" \
  -H "X-API-KEY: YOUR_KEY" | python3 -m json.tool
```

This returns all available avatars — both stock HeyGen avatars and any custom Photo Avatars you've created.

Each avatar has:
- avatar_id — the ID you use when generating videos
- avatar_name — human-readable name
- preview_image_url — what they look like

### Create a New Photo Avatar

Step 1: Upload your image

```bash
curl -s -X POST "https://upload.heygen.com/v1/asset" \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/your-image.jpg
```

Returns: { "data": { "url": "https://..." } }

Step 2: Create an avatar group

```bash
curl -s -X POST "https://api.heygen.com/v2/photo_avatar/avatar_group/create" \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Avatar Name",
    "image_urls": ["https://the-url-from-step-1"]
  }'
```

Returns: { "data": { "group_id": "..." } }

Step 3: Train the avatar

```bash
curl -s -X POST "https://api.heygen.com/v2/photo_avatar/train" \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "group_id": "group-id-from-step-2"
  }'
```

Training takes a few minutes. Once done, the avatar appears in your avatar list.

### Image Requirements for Photo Avatars
- Clear, front-facing photo
- Good lighting, neutral background
- Face clearly visible, not obscured
- JPEG or PNG format
- The more realistic the face, the better the lip-sync quality
- Note: Heavily stylised images (cartoon, Pixar-style) may not work well with lip-sync — realistic photos work best

---

## Generating Videos

### Basic Video Generation

```bash
curl -s -X POST "https://api.heygen.com/v2/video/generate" \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video_inputs": [{
      "character": {
        "type": "avatar",
        "avatar_id": "YOUR_AVATAR_ID",
        "avatar_style": "normal"
      },
      "voice": {
        "type": "text",
        "input_text": "Hello! This is my first video. Pretty cool right?",
        "voice_id": "YOUR_VOICE_ID"
      }
    }],
    "dimension": {
      "width": 1280,
      "height": 720
    }
  }'
```

Returns: { "data": { "video_id": "..." } }

### Check Video Status

```bash
curl -s "https://api.heygen.com/v1/video_status.get?video_id=YOUR_VIDEO_ID" \
  -H "X-API-KEY: $API_KEY"
```

Status values: pending → processing → completed (or failed)

When completed, the response includes video_url — your finished video!

### Poll Until Complete (Script)

```bash
VIDEO_ID="your-video-id"
API_KEY="your-key"

while true; do
  STATUS=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
    -H "X-API-KEY: $API_KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['status'])")
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    URL=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
      -H "X-API-KEY: $API_KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['video_url'])")
    echo "Done! Video URL: $URL"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Video generation failed!"
    break
  fi
  
  sleep 10
done
```

---

## Voices

### List Available Voices

```bash
curl -s "https://api.heygen.com/v2/voices" \
  -H "X-API-KEY: YOUR_KEY" | python3 -m json.tool
```

### Using ElevenLabs Voices
If you have ElevenLabs voices linked to HeyGen, they appear in the voice list. Use them with "type": "text" (not "audio").

### Voice in Video Request

```json
"voice": {
  "type": "text",
  "input_text": "Your script goes here",
  "voice_id": "voice-id-from-list"
}
```

---

## Video Dimensions

Common formats:
- Landscape (16:9): {"width": 1920, "height": 1080} or {"width": 1280, "height": 720}
- Portrait (9:16): {"width": 1080, "height": 1920} — for TikTok, Reels, Shorts
- Square (1:1): {"width": 1080, "height": 1080} — for Instagram posts

---

## Important Rules & Gotchas

### Script Writing Rules
- NO TAGS — HeyGen reads [whispers], [sighs], [pause] as literal spoken text
- NO stage directions — no *looks at camera* or (laughing)
- NO markdown — no **bold**, no # headers, no bullet points
- Plain spoken dialogue ONLY — write exactly what should be said out loud
- Keep scripts conversational and natural

### Credit System
- API billing is separate from web UI billing — API uses pay-as-you-go USD balance
- Avatar III (standard): ~$1/min via API
- Avatar IV (premium): ~$6/min via API
- Web UI has separate monthly credits that DON'T apply to API
- Check your balance before generating

### Common Errors
- VOICE_CLIENT_ERROR — voice quota exhausted (monthly limit)
- insufficient_credits — need to top up API USD balance
- Timeout on video status — generation can take 2-5 minutes, keep polling

### Rate Limits
- Don't spam the API — space out requests
- Poll video status every 10-15 seconds, not every second

---

## Quick Reference

| Action | Endpoint | Method |
|--------|----------|--------|
| List avatars | /v2/avatars | GET |
| List voices | /v2/voices | GET |
| Generate video | /v2/video/generate | POST |
| Check status | /v1/video_status.get?video_id=X | GET |
| Upload image | upload.heygen.com/v1/asset | POST |
| Create avatar group | /v2/photo_avatar/avatar_group/create | POST |
| Train avatar | /v2/photo_avatar/train | POST |

---

## Example: Full Video Generation Flow

```bash
API_KEY="your-key"
AVATAR_ID="your-avatar-id"
VOICE_ID="your-voice-id"

# 1. Generate
VIDEO_ID=$(curl -s -X POST "https://api.heygen.com/v2/video/generate" \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"video_inputs\": [{
      \"character\": {
        \"type\": \"avatar\",
        \"avatar_id\": \"$AVATAR_ID\",
        \"avatar_style\": \"normal\"
      },
      \"voice\": {
        \"type\": \"text\",
        \"input_text\": \"Hey everyone! Welcome to our channel. We are so excited to have you here.\",
        \"voice_id\": \"$VOICE_ID\"
      }
    }],
    \"dimension\": {\"width\": 1280, \"height\": 720}
  }" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['video_id'])")

echo "Video ID: $VIDEO_ID"

# 2. Wait and poll
sleep 30
curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
  -H "X-API-KEY: $API_KEY" | python3 -m json.tool
```

---

## Setting Up Your Avatars

Since you don't have avatar looks yet, here's your workflow:

1. Choose or create images for each character (Frankie and Pink)
2. Upload each image via the asset upload endpoint
3. Create avatar groups — one per character
4. Train each avatar
5. List avatars to get the avatar_ids
6. Pick voices from the voice list that match each character's personality
7. Store the avatar_id and voice_id in your TOOLS.md for quick reference

You can create as many avatars as you want — different expressions, poses, outfits. Just repeat the upload → create group → train process for each one.

---

*Guide created by Jeff ⚡ — ask if you need help with anything!*
