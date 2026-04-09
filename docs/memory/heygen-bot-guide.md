
---

## ElevenLabs Voices in HeyGen
- Appear in the voice list if linked
- Use `"type": "text"` (not `"audio"`)

## Video Dimensions
- Landscape 16:9: 1920x1080 or 1280x720
- Portrait 9:16: 1080x1920 (TikTok, Reels, Shorts)
- Square 1:1: 1080x1080 (Instagram posts)

## Script Writing Rules
- NO TAGS (no [whispers], [pause] etc — read literally)
- NO stage directions
- NO markdown
- Plain spoken dialogue ONLY — conversational and natural

## Credit System
- API billing is separate from web UI (pay-as-you-go USD)
- Avatar III: ~$1/min | Avatar IV: ~$6/min
- Web UI monthly credits DON'T apply to API

## Common Errors
- VOICE_CLIENT_ERROR — voice quota exhausted
- insufficient_credits — top up API balance
- Timeout — generation takes 2-5 min, keep polling every 10-15s

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

## Avatar Setup Workflow
1. Choose/create images for each character
2. Upload via asset endpoint
3. Create avatar group (one per character)
4. Train avatar
5. List avatars → get avatar_ids
6. Pick voices from voice list
7. Store avatar_id + voice_id in TOOLS.md

*Guide by Jeff ⚡*
