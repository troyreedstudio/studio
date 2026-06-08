# LMC Scout Code of Conduct

**Version 1.0 — Draft for legal review · 2026-06-06**

This is the agreement every Scout signs during onboarding before they can accept their first paid check. Plain English, no legalese. The TL;DR is the same as the long form: **you film public-facing spaces, you don't film people's faces, you don't record audio, and you stop the moment anyone with authority at the venue tells you to.**

---

## What you can do

- **Film from the public sidewalk, street, or parking lot** of any venue
- **Film the line, queue, or entry area** of a venue from a public vantage point
- **Film the public-facing interior of a venue** that doesn't have a posted "no filming" policy (dining room of a restaurant, lobby of a hotel, sales floor of a store, public concourse of a stadium)
- **Film signage, the exterior, the building, the vibe** — wide shots that establish what's happening at this location right now
- **Film for a maximum of 15 seconds for Standard/Priority checks, or 30 seconds for Partner Interior checks.** That's the product. Anything longer wastes your time and ours.

## What you cannot do

### People
- **No close-ups of strangers' faces.** Wide shots only. If a face fills the frame, the clip won't deliver.
- **No filming children.** If kids are visibly in frame, stop, reposition, or hit **TROUBLE HERE** and abort.
- **No filming people who explicitly object to being filmed.** If someone tells you to stop, stop. No argument.

### Places
- **No filming past any "No Photography" sign.** If you see one, it's red — stop and abort.
- **No filming security checkpoints at airports.** TSA forbids it. We forbid it. Curbside and check-in lobby only.
- **No filming inside hospitals, courts, schools, or any government building past security.** Period.
- **No filming inside bathrooms, locker rooms, dressing rooms, or any space with a reasonable expectation of privacy.** Ever.
- **No trespassing.** If the only way to get the shot is to cross a fence or enter staff-only areas, don't.

### Audio
- **Your camera mic is muted by default.** Don't unmute it. Florida (and many other states) requires consent from everyone you record. You don't have that consent. Leave it off.

### Conduct at the venue
- **Be unobtrusive.** Hold the phone like you're watching a video, not filming. Stand to the side. Get in, get the shot, get out.
- **Do not provoke a reaction.** Don't film people who are arguing, fighting, intoxicated, or in distress. Aborting is always the right call.
- **If a venue staff member or bouncer asks you what you're doing,** say "I'm using LMC, an app that does location checks. I can leave right now if that's a problem." Then leave if asked.
- **If asked to stop filming,** stop immediately, hit **TROUBLE HERE** in the app, select the right reason, and walk away. You'll still be paid for travel.

### Use of the app
- **Don't fake a check.** GPS-stamping verifies you were inside the geofence when filming. Faking a clip from somewhere else is fraud and triggers immediate Scout deactivation + clawback of payment.
- **Don't film the same venue twice within 20 minutes.** The cooldown protects against spam.
- **Don't share clips with anyone other than LMC.** The Seeker who paid for the check owns it. You don't.

## What happens to your footage

- Every clip is uploaded directly to LMC's verification pipeline. You can't keep a local copy.
- We automatically blur faces detected in frame before delivery.
- We automatically check that the GPS coordinates and venue signage match the Seeker's request. If they don't, the clip is rejected and you're notified.
- Once delivered to the Seeker, the clip is **private to them.** It is not posted publicly. It is not used for advertising. It is not sold to third parties.

## Pay

- You're paid per delivered clip:
  - **Standard ($8)** — clip delivered within the 10-minute window
  - **Priority ($12)** — clip delivered within the 7-minute window
- If you abort honestly via **TROUBLE HERE** (venue closed, hostile staff, unsafe, line gone), you're paid **$3 for travel** — provided GPS confirms you were inside the geofence.
- If you fake a check, abandon a job, or violate this Code of Conduct, you're not paid and your account may be suspended.

## Termination

LMC can deactivate your Scout account at any time for any violation of this Code. The most common reasons are:
- Repeated low ratings from Seekers
- TROUBLE HERE reports about your behavior at a venue
- Fake or manipulated clips
- Violating the audio / face / children / no-go rules above
- Failing to respond to dispatch requests for more than 30 days

Deactivation is final. Outstanding earnings are paid out within 7 business days.

## Indemnification

You acknowledge that you're an independent contractor, not an LMC employee. You're responsible for following local laws, respecting venue policies, and conducting yourself appropriately. If you ignore this Code and cause harm — to a venue, a third party, or yourself — LMC is not liable.

## Disputes and takedowns

If a venue or individual contacts LMC asking that a clip be removed, we have a **24-hour takedown SLA.** We may contact you for context but the clip is removed regardless. You are not penalized for honest, in-policy footage that gets a takedown request — that's just how the takedown process works.

## Signing

By tapping **I AGREE** during Scout onboarding, you acknowledge that you've read this Code of Conduct, understand it, and will follow it on every job. You can revisit it any time from your Scout dashboard.

---

**Internal notes (not shown to Scouts):**

- Two-party-consent audio recording laws apply in: CA, FL, IL, MA, MD, MT, NH, NV, PA, WA, plus parts of HI, DE, CT. Default-mute the camera across the board.
- Face blur runs via iOS Vision API on the device before upload (cheaper, faster, no PII leaves the device unblurred).
- Signage / venue match runs server-side after upload using OCR + GPS bounds.
- All retention follows the privacy policy: clips deleted from CDN after 30 days unless flagged for dispute.

**For attorney review:**

1. Indemnification language — strong enough? Does it survive a Scout incident at a venue?
2. Audio recording — is default-mute + Scout-opt-in legally distinct from default-off?
3. Children — should we go further than "stop and abort" — e.g., automatic delivery refusal if facial detection identifies minors?
4. Takedown SLA — 24h achievable for v1? DMCA-style process or simpler?
5. Two-party consent states — explicit per-state warning in onboarding for those states, or blanket no-audio rule?
