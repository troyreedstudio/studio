# Let Me Check — Telegram Bot MVP Plan

## Overview
On-demand visual verification of nightlife venues. $15 per 60-second clip. Delivered in under 15 minutes.

---

## Phase 1: Telegram Bot MVP

### What We're Building
A Telegram bot that:
1. Takes a user's venue request + payment
2. Notifies the nearest available Checker
3. Receives the clip from the Checker
4. Delivers it to the user

No app. No complex infrastructure. Just a bot, Stripe, and a small team of Checkers.

---

## The Bot Flow

### User Side
```
User: /start
Bot: "Welcome to Let Me Check 👀 Get a live 60-sec video of any nightclub before you go. $15 per check. Type the venue name + city to get started."

User: "Liv Miami"
Bot: "Got it! We'll send you a live clip of Liv, Miami within 15 minutes. Pay $15 here to confirm: [Stripe Payment Link]"

User: [pays]
Bot: "Payment confirmed ✅ Your Checker is on the way. You'll receive your clip shortly."

[15 min later]
Bot: [sends video clip]
Bot: "Here's your live check of Liv, Miami — filmed 8 minutes ago. Enjoy your night! 🎉"
```

### Checker Side (separate Telegram group/bot)
```
Bot: "🔔 New request! Venue: Liv Miami. Pay: $8. Accept?"
Checker: /accept
Bot: "Great! Head to Liv Miami now. Film a 60-sec clip showing the entrance, line, and crowd. Send it back here when done."
Checker: [sends video]
Bot: "Clip received ✅ Delivered to user. $8 added to your balance."
```

---

## Tech Setup (No-Code/Low-Code First)

### Tools Needed
| Tool | Purpose | Cost |
|------|---------|------|
| BotFather (Telegram) | Create the bot | Free |
| Make.com or n8n | Automate the workflow | $9-29/month |
| Stripe | Payment processing | 2.9% + 30¢ per transaction |
| Airtable | Database (venues, checkers, requests) | Free tier |
| Cloudflare or Google Drive | Video storage | Free to start |
| Telegram Groups | Checker dispatch channel | Free |

### Total startup cost: ~$50-100/month

---

## Database Structure (Airtable)

### Venues Table
- Venue Name
- City
- Address
- Active (yes/no)
- Average crowd level (historical)

### Checkers Table
- Name
- Telegram handle
- City
- Status (available/busy/offline)
- Rating (1-5)
- Total earnings
- Bank/PayPal details

### Requests Table
- Request ID
- Venue
- User Telegram ID
- Checker assigned
- Time requested
- Time delivered
- Status (pending/in-progress/delivered)
- Payment status

---

## Pricing Structure
| Tier | Price | Checker Pay | Platform |
|------|-------|------------|---------|
| Standard | $15 | $8 | $7 |
| Priority (5 min) | $25 | $13 | $12 |

---

## Launch Checklist

### Week 1 — Setup
- [ ] Create Telegram bot via BotFather
- [ ] Set up Stripe account
- [ ] Build Airtable database
- [ ] Set up Make.com automation workflow
- [ ] Create Checker onboarding form (Typeform)
- [ ] Write Checker guidelines + filming instructions

### Week 2 — Recruit Checkers
- [ ] Post on Miami Facebook nightlife groups
- [ ] Post on Craigslist gigs section
- [ ] Instagram/TikTok: "Get paid $8 to film 60-sec videos at clubs"
- [ ] Target: 20 Checkers in Miami for launch
- [ ] Verify each Checker (ID + test clip)

### Week 3 — Soft Launch
- [ ] 10 target venues in Miami (Liv, Story, E11even, etc.)
- [ ] Invite 50 beta users via Instagram DMs
- [ ] Offer first 3 checks free to seed reviews
- [ ] Monitor every request manually

### Week 4 — Iterate
- [ ] Fix bottlenecks
- [ ] Collect user feedback
- [ [ Target: 50 paid requests in Month 1

---

## Checker Filming Guidelines
1. Film from the street/entrance — do NOT go inside
2. Show the line (or lack of one)
3. Show the crowd visible from entrance
4. 45-90 seconds
5. Steady phone, no shaky cam
6. No commentary needed — just visual
7. Must be filmed within 10 min of receiving request

---

## Key Metrics to Track
- Requests per day
- Average delivery time
- Checker acceptance rate
- User satisfaction (thumbs up/down)
- Revenue per week

---

## Month 2 Goals
- 100+ paid requests
- 30+ active Checkers
- Expand to 25 venues
- Begin building proper app

---

## The Pitch (for investors later)
"We are the Uber for nightlife verification. On-demand, real-time video clips of any venue in under 15 minutes. $15 per check. Asset-light, globally scalable, with a data moat that grows with every clip."

---

*Built by Pink 🌸 for Troy & Let Me Check*
