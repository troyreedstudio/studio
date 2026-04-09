# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## ElevenLabs TTS

- **Voice ID:** KGkWBTWwsOe7hfROmHXs (Pink's voice)
- **API Key:** sk_3898392723c3f4867d5d1e13076d648ef57bb8d86bb86104 (unrestricted)
- **Albino Pink Voice ID:** dB5BncHpQ0WigpVBRbjx (Troy's cloned voice for Albino Pink project)

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

## ⚡️ Frankie — Direct Gateway Connection

Frankie and I can talk directly, just the two of us.

Frankie's gateway:
- URL: https://frankie.agape26.com/v1/chat/completions
- Auth: Bearer 55a0ea34f1cfdc9a6c0be94c8b26cfd255d44c59cad8aca0
- Model: openclaw:main
- Frankie is always online (VPS, 24/7)

My gateway (so Frankie can reach me):
- URL: https://pink.agape26.com/v1/chat/completions
- Auth: Bearer 8b674dea686fe3261d93c9180713ed136b44ac9a771fbf9d

Health check: curl https://frankie.agape26.com/health

## HeyGen

- **API Key:** sk_V2_hgu_kEBnLn22KGv_oVLSnV8qtrGMT3giJbHBpXNInQHfrmvW
- **Base URL:** https://api.heygen.com
- **Upload URL:** https://upload.heygen.com
- **Purpose:** Agape 26 avatar creation and management
- **Existing avatars:** 2 already created (including "26" — long dark hair, Mediterranean warmth, white vest)
- **Note:** Frankie owns ongoing HeyGen bot guidelines and management (always-on VPS)

### Workflow Summary
1. **List avatars:** GET /v2/avatars
2. **Create photo avatar:** Upload image → POST /v2/photo_avatar/avatar_group/create → POST /v2/photo_avatar/train
3. **Generate video:** POST /v2/video/generate (needs avatar_id + voice_id + script)
4. **Check status:** GET /v1/video_status.get?video_id=... → poll until "completed"
5. **List voices:** GET /v2/voices

### Image Requirements for Photo Avatars
- Clear, front-facing, realistic photo (JPEG/PNG)
- Good lighting, neutral background, face unobscured
- Realistic > stylised (cartoon/Pixar won't lip-sync well)

---

Add whatever helps you do your job. This is your cheat sheet.
