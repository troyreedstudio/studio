-- =============================================================================
-- LMC Demo Account Seed Script
-- Purpose: Give the Apple reviewer a pre-seeded Seeker (with a completed check
--          in History they can replay) and a Scout account they can browse.
-- Where to run: Supabase dashboard -> SQL Editor -> paste this whole file -> Run
-- Who runs it: Troy (once, before submitting for App Review)
-- Safe to re-run: Yes. Every insert uses ON CONFLICT DO NOTHING.
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE TWO AUTH ACCOUNTS IN SUPABASE FIRST (before running this)
-- =============================================================================
-- Before you paste and run this script, you need to create two demo accounts
-- in the app itself (or via Supabase Auth dashboard -> Users -> Add user):
--
--   Seeker demo account:
--     Email: reviewer@letmecheck.demo
--     Password: (pick something strong -- paste it into App Store Connect review
--                notes only, never commit it to the repo)
--     After signing in once in the app, the profile row is created automatically.
--
--   Scout demo account:
--     Email: scout.reviewer@letmecheck.demo
--     Password: (same -- strong, put in App Review notes only)
--     Sign in once as Scout in the app so the profile row is created.
--
-- Once both accounts exist, find their UUIDs in the Supabase dashboard:
--   Authentication -> Users -> click each email -> copy the "User UID" field.
--
-- Then paste both UUIDs into the two variables below.
-- =============================================================================

-- REPLACE THESE TWO VALUES with the actual UUIDs from Supabase Auth -> Users.
-- They look like: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

DO $$
DECLARE
  -- Paste the Seeker (reviewer@letmecheck.demo) UUID here:
  v_seeker_uid   uuid := 'PASTE-SEEKER-UUID-HERE';

  -- Paste the Scout (scout.reviewer@letmecheck.demo) UUID here:
  v_scout_uid    uuid := 'PASTE-SCOUT-UUID-HERE';

  -- IDs for the rows this script creates.
  -- Fixed UUIDs so the script stays idempotent (re-runnable without duplicates).
  v_check_id     uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_clip_id      uuid := 'aaaaaaaa-0002-0002-0002-000000000002';
  v_payment_id   uuid := 'aaaaaaaa-0003-0003-0003-000000000003';

BEGIN

  -- ===========================================================================
  -- GUARD: make sure Troy filled in the UIDs before running.
  -- ===========================================================================
  IF v_seeker_uid::text = 'PASTE-SEEKER-UUID-HERE' OR
     v_scout_uid::text  = 'PASTE-SCOUT-UUID-HERE' THEN
    RAISE EXCEPTION
      'Stop! Replace PASTE-SEEKER-UUID-HERE and PASTE-SCOUT-UUID-HERE '
      'with the real UUIDs from Supabase Authentication -> Users, then re-run.';
  END IF;

  -- ===========================================================================
  -- BLOCK 1: Make sure both profiles exist and have the right display names.
  -- (The app creates a profile row on first sign-in. This upserts display names
  --  so the reviewer sees sensible names, not blank fields.)
  -- ===========================================================================

  -- Seeker profile: what the reviewer sees as their own name when logged in.
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (v_seeker_uid, 'Demo Seeker', 'seeker')
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name;

  -- Scout profile: what the Seeker sees on the Delivery screen ("filmed by ...").
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (v_scout_uid, 'Demo Scout', 'scout')
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name;


  -- ===========================================================================
  -- BLOCK 2: Create a delivered check for the Seeker's History.
  --
  -- market_id = 'mia' (Miami -- the live launch market in the seed data).
  -- venue_id  = NULL. The venue catalog uses text slug IDs and the Apple reviewer
  --   does not need to navigate to a specific venue -- they just need to see a
  --   completed check in History. Leaving it NULL is valid (the checks table
  --   allows NULL venue_id for free-text location requests).
  -- status = 'delivered' written directly here (this script runs as the Supabase
  --   service role / SQL Editor, which bypasses the client-only transition guard
  --   that prevents normal users from writing status directly).
  -- tier = 'standard' ($15 Seeker / $8 Scout).
  -- location_label = human-readable label shown in History.
  -- ===========================================================================

  INSERT INTO public.checks (
    id,
    seeker_id,
    scout_id,
    venue_id,
    market_id,
    tier,
    status,
    currency,
    location_label,
    requested_lat,
    requested_lng,
    created_at,
    updated_at
  )
  VALUES (
    v_check_id,
    v_seeker_uid,
    v_scout_uid,
    NULL,             -- no specific venue needed for the demo
    'mia',            -- Miami (live market)
    'standard',
    'delivered',      -- final state: reviewer can see the Delivery screen
    'USD',
    'Venue Check - Miami',
    25.7617,          -- Miami lat/lng (for display only, not for geo-fencing)
    -80.1918,
    now() - INTERVAL '2 hours',   -- happened 2 hours ago (shows in History as recent)
    now() - INTERVAL '2 hours'
  )
  ON CONFLICT (id) DO NOTHING;


  -- ===========================================================================
  -- BLOCK 3: Create the clip row.
  --
  -- The clip must have status = 'ready' for the app to show the Delivery screen
  -- (this is the deliver-needs-READY-clip guard in transition_check).
  --
  -- mux_playback_id: this is the MOST IMPORTANT field for the video to actually
  -- play on the Delivery screen. You have two options:
  --
  --   OPTION A (easiest): Find a real Mux playback ID from a previously delivered
  --   check (one you tested end-to-end). Go to Supabase -> Table Editor ->
  --   clips -> filter by status='ready' -> copy the mux_playback_id value.
  --   Then replace PASTE-REAL-MUX-PLAYBACK-ID-HERE below with that value.
  --   The reviewer will watch that real clip as the demo.
  --
  --   OPTION B (if no real clips exist yet): Leave mux_playback_id as NULL.
  --   The app will show the Delivery screen but the video player will be empty.
  --   In your App Review notes, tell Apple: "The delivery screen shows the video
  --   player UI -- a live check generates a real video, but this is a seeded demo
  --   row without a real asset." Apple usually accepts this for a marketplace.
  --
  -- Replace the string below (or set it to NULL if you use Option B).
  -- ===========================================================================

  INSERT INTO public.clips (
    id,
    check_id,
    status,
    filmed_at,
    filmed_lat,
    filmed_lng,
    mux_playback_id,
    mux_playback_policy,
    duration_secs,
    created_at
  )
  VALUES (
    v_clip_id,
    v_check_id,
    'ready',
    now() - INTERVAL '2 hours',
    25.7617,    -- filmed at Miami lat/lng
    -80.1918,
    -- OPTION A: paste your real Mux signed playback ID here (looks like: 'abc123xyz456')
    -- OPTION B: replace with NULL if no real clip exists yet
    NULL,
    'signed',
    15.0,       -- 15-second demo clip
    now() - INTERVAL '2 hours'
  )
  ON CONFLICT (id) DO NOTHING;


  -- ===========================================================================
  -- BLOCK 4: Create the payment row.
  --
  -- This makes History show a payment amount ($16.50 = standard $15 + $1.50 fee).
  -- status = 'transferred' means the Scout has been paid -- the full lifecycle
  -- is complete, which is what a reviewer needs to see for a "delivered" check.
  --
  -- stripe_payment_intent_id is NULL here (no real Stripe PI for the demo).
  -- The app reads payment amounts from this row for the History detail view.
  -- ===========================================================================

  INSERT INTO public.payments (
    id,
    check_id,
    stripe_payment_intent_id,
    stripe_charge_id,
    stripe_transfer_id,
    amount_total,    -- 1650 cents = $16.50 (standard $15 + $1.50 platform fee)
    scout_amount,    -- 800 cents = $8.00 Scout earnings
    currency,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_payment_id,
    v_check_id,
    NULL,       -- no real Stripe PI (demo seed, no live money)
    NULL,
    NULL,
    1650,
    800,
    'USD',
    'transferred',
    now() - INTERVAL '2 hours',
    now() - INTERVAL '2 hours'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '--- Demo seed complete ---';
  RAISE NOTICE 'Seeker:  % (reviewer@letmecheck.demo)', v_seeker_uid;
  RAISE NOTICE 'Scout:   % (scout.reviewer@letmecheck.demo)', v_scout_uid;
  RAISE NOTICE 'Check:   % (status=delivered, market=mia)', v_check_id;
  RAISE NOTICE 'Clip:    % (status=ready)', v_clip_id;
  RAISE NOTICE 'Payment: % (transferred, $16.50 / $8.00 Scout)', v_payment_id;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEP: If you used OPTION B (NULL playback ID), update the';
  RAISE NOTICE 'clip row once you have a real Mux ID:';
  RAISE NOTICE '  UPDATE public.clips SET mux_playback_id = ''your-id-here''';
  RAISE NOTICE '  WHERE id = ''%'';', v_clip_id;

END $$;

-- =============================================================================
-- VERIFICATION QUERIES (run these after the script to confirm it worked)
-- =============================================================================

-- Check 1: Is the delivered check in place?
-- SELECT id, status, tier, market_id, location_label
-- FROM public.checks
-- WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- Check 2: Is the clip 'ready'?
-- SELECT id, status, mux_playback_id, duration_secs
-- FROM public.clips
-- WHERE check_id = 'aaaaaaaa-0001-0001-0001-000000000001';

-- Check 3: Is the payment row there?
-- SELECT id, status, amount_total, scout_amount, currency
-- FROM public.payments
-- WHERE check_id = 'aaaaaaaa-0001-0001-0001-000000000001';
