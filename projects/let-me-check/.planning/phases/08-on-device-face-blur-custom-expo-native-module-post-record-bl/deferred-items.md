# Phase 08 - Deferred items (out of scope)

- [08-05] app/lib/scout-location.test.ts: 7 pre-existing failures (`supabase.rpc is not a function`) — the test mock for `./supabase` lacks an `rpc` stub. Unrelated to the blur wiring; these failed before 08-05 began. Fix in a test-harness cleanup pass.
- [08-05] app/(scout)/filming.tsx is 798 lines (>500). A pre-existing TODO at the top of the file already flags this; the 08-05 change to it was a small presentational addition (the 'securing' state). Extract the HUD/steps/upload UI in the 08-06 cleanup.
</content>
</invoke>
